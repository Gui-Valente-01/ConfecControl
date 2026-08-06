"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { eChamado, eTipoAviso, textoDoAviso, urgenciaPadrao, type TipoAviso } from "@/lib/avisos";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

/**
 * Registra um aviso. Usada pelo sistema e pelos chamados da bancada.
 *
 * Não é uma server action exportada de propósito: quem chama são as outras
 * actions (criar pedido, mover etapa), e expor isto como action daria a
 * qualquer um o poder de inventar aviso em qualquer empresa.
 */
export async function registrarAviso(input: {
  companyId: string;
  orderId?: string | null;
  tipo: TipoAviso;
  titulo: string;
  mensagem?: string | null;
  urgente?: boolean;
  criadoPor?: string | null;
}): Promise<void> {
  try {
    await prisma.aviso.create({
      data: {
        companyId: input.companyId,
        orderId: input.orderId ?? null,
        tipo: input.tipo,
        titulo: input.titulo,
        mensagem: textoDoAviso(input.tipo, input.mensagem),
        urgente: input.urgente ?? urgenciaPadrao(input.tipo),
        criadoPor: input.criadoPor ?? null,
      },
    });
  } catch {
    // Aviso é acessório: se falhar, não pode derrubar o que a pessoa estava
    // fazendo. Perder o aviso é ruim; perder o pedido é muito pior.
  }
}

/** Chamado disparado por quem está na bancada: cor, foto, ajuda ou recado. */
export async function criarChamadoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const tipoBruto = String(formData.get("tipo") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const mensagem = String(formData.get("mensagem") ?? "").trim();
  const urgenteMarcado = formData.get("urgente") === "on";

  if (!eTipoAviso(tipoBruto) || !eChamado(tipoBruto)) {
    return { error: "Tipo de chamado inválido." };
  }
  if (!orderId) return { error: "Pedido não encontrado." };

  const pedido = await prisma.order.findFirst({
    where: { id: orderId, companyId: user.companyId },
    select: { id: true, number: true },
  });
  if (!pedido) return { error: "Pedido não encontrado." };

  await registrarAviso({
    companyId: user.companyId,
    orderId: pedido.id,
    tipo: tipoBruto,
    titulo: `Pedido #${pedido.number}`,
    mensagem,
    // O tipo já nasce urgente quando é pedido de ajuda; a marcação só soma.
    urgente: urgenteMarcado || urgenciaPadrao(tipoBruto),
    criadoPor: user.name,
  });

  revalidatePath("/avisos");
  revalidatePath("/bancada");
  revalidatePath(`/pedidos/${pedido.id}`);
  return { success: "Aviso enviado para a equipe." };
}

/** Marca todos os avisos da empresa como lidos por quem está usando. */
export async function marcarTodosLidosAction(): Promise<FormState> {
  const user = await requireUser();

  const naoLidos = await prisma.aviso.findMany({
    where: { companyId: user.companyId, leituras: { none: { userId: user.id } } },
    select: { id: true },
  });

  if (naoLidos.length > 0) {
    // skipDuplicates: dois cliques seguidos não podem estourar a chave.
    await prisma.avisoLeitura.createMany({
      data: naoLidos.map((a) => ({ avisoId: a.id, userId: user.id })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/avisos");
  revalidatePath("/");
  return { success: "Tudo marcado como lido." };
}

/** Marca um aviso como lido. Usada ao abrir o pedido a partir da lista. */
export async function marcarLidoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const avisoId = String(formData.get("avisoId") ?? "");
  if (!avisoId) return { error: "Aviso não encontrado." };

  const aviso = await prisma.aviso.findFirst({
    where: { id: avisoId, companyId: user.companyId },
    select: { id: true },
  });
  if (!aviso) return { error: "Aviso não encontrado." };

  await prisma.avisoLeitura.createMany({
    data: [{ avisoId: aviso.id, userId: user.id }],
    skipDuplicates: true,
  });

  revalidatePath("/avisos");
  return { success: "Marcado como lido." };
}
