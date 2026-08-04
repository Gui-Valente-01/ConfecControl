"use server";

import { revalidatePath } from "next/cache";
import { adminCompanyId, requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { type TipoLixeira, eTipoLixeira, rotuloTipo } from "@/lib/lixeira";

type Autorizacao = { companyId: string; erro?: undefined } | { companyId?: undefined; erro: FormState };

// Restaurar: Dono e Gerente. O Gerente exclui material e terceirizada, então
// precisa poder desfazer o próprio engano sem depender de ninguém.
async function requireRestaurador(): Promise<Autorizacao> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return { erro: { error: "Você não tem permissão para mexer na lixeira." } };
  }
  return { companyId: user.companyId };
}

// Apagar de vez é irreversível e leva a cascata junto: só o Dono.
async function requireDono(): Promise<Autorizacao> {
  const companyId = await adminCompanyId();
  if (!companyId) return { erro: { error: "Apenas o dono pode apagar de vez." } };
  return { companyId };
}

function lerTipo(formData: FormData): TipoLixeira | null {
  const bruto = String(formData.get("tipo") ?? "");
  return eTipoLixeira(bruto) ? bruto : null;
}

// Cada tipo aponta para o seu "delegate" do Prisma. O acesso por índice é o que
// evita repetir a mesma função cinco vezes, uma por cadastro.
function tabela(tipo: TipoLixeira) {
  return {
    cliente: prisma.client,
    peca: prisma.product,
    material: prisma.material,
    terceirizada: prisma.partner,
    servico: prisma.service,
  }[tipo];
}

export async function restoreAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireRestaurador();
  if (auth.erro) return auth.erro;

  const id = String(formData.get("id") ?? "");
  const tipo = lerTipo(formData);
  if (!id || !tipo) return { error: "Item não encontrado na lixeira." };

  // deletedAt: { not: null } é o que faz o filtro global sair da frente e
  // deixar a consulta enxergar o que está na lixeira.
  const restaurado = await (tabela(tipo) as { updateMany: (a: unknown) => Promise<{ count: number }> }).updateMany({
    where: { id, companyId: auth.companyId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  if (restaurado.count === 0) return { error: "Item não encontrado na lixeira." };

  revalidatePath("/lixeira");
  for (const rota of ["/", "/clientes", "/produtos", "/estoque", "/terceirizadas", "/pedidos", "/relatorios"]) {
    revalidatePath(rota);
  }
  return { success: `${rotuloTipo(tipo)} restaurado. Ele voltou para a lista.` };
}

export async function purgeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireDono();
  if (auth.erro) return auth.erro;

  const id = String(formData.get("id") ?? "");
  const tipo = lerTipo(formData);
  if (!id || !tipo) return { error: "Item não encontrado na lixeira." };

  // Agora sim apaga de verdade, com a cascata do banco. Só chega aqui quem já
  // mandou para a lixeira antes e confirmou de novo nesta tela.
  const apagado = await (tabela(tipo) as { deleteMany: (a: unknown) => Promise<{ count: number }> }).deleteMany({
    where: { id, companyId: auth.companyId, deletedAt: { not: null } },
  });
  if (apagado.count === 0) return { error: "Item não encontrado na lixeira." };

  revalidatePath("/lixeira");
  return { success: `${rotuloTipo(tipo)} apagado de vez.` };
}
