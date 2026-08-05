"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyId, requireUser } from "@/lib/auth";
import { planHasFeature } from "@/lib/features";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

// --------- Mesas / bancada (só empresas com o módulo bancada) ---------

async function requireBancadaCompany(): Promise<string | null> {
  const user = await requireUser();
  if (!planHasFeature(user.features, "bancada")) return null;
  return user.companyId;
}

function revalidateMesas() {
  revalidatePath("/configuracoes");
  revalidatePath("/bancada");
}

export async function createMesaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const companyId = await requireBancadaCompany();
  if (!companyId) return { error: "Ative o módulo Bancada para cadastrar mesas." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome da mesa." };

  const last = await prisma.mesa.findFirst({ where: { companyId }, orderBy: { position: "desc" }, select: { position: true } });
  await prisma.mesa.create({ data: { companyId, name, position: (last?.position ?? 0) + 1 } });

  revalidateMesas();
  return { success: `Mesa ${name} criada.` };
}

export async function updateMesaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const companyId = await requireBancadaCompany();
  if (!companyId) return { error: "Ative o módulo Bancada para editar mesas." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const position = Number(formData.get("position") ?? 0);
  const active = String(formData.get("active") ?? "") === "on";
  if (!id || !name) return { error: "Informe o nome da mesa." };

  // Só aceita responsável que seja funcionário ativo da própria empresa.
  const responsibleRaw = String(formData.get("responsibleUserId") ?? "").trim();
  let responsibleUserId: string | null = null;
  if (responsibleRaw) {
    const member = await prisma.user.findFirst({
      where: { id: responsibleRaw, companyId, active: true },
      select: { id: true },
    });
    responsibleUserId = member?.id ?? null;
  }

  // Etapa que a mesa atende. Em branco = aceita qualquer pedido. Só aceita
  // etapa da própria empresa, senão daria para apontar para a etapa de outra.
  const stageRaw = String(formData.get("stageId") ?? "").trim();
  let stageId: string | null = null;
  if (stageRaw) {
    const stage = await prisma.productionStage.findFirst({
      where: { id: stageRaw, companyId },
      select: { id: true },
    });
    stageId = stage?.id ?? null;
  }

  const updated = await prisma.mesa.updateMany({
    where: { id, companyId },
    data: { name, position: Number.isFinite(position) ? position : 0, active, responsibleUserId, stageId },
  });
  if (updated.count === 0) return { error: "Mesa não encontrada." };

  revalidateMesas();
  return { success: "Mesa atualizada." };
}

export async function deleteMesaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const companyId = await requireBancadaCompany();
  if (!companyId) return { error: "Ação indisponível." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Mesa não encontrada." };

  const deleted = await prisma.mesa.deleteMany({ where: { id, companyId } });
  if (deleted.count === 0) return { error: "Mesa não encontrada." };

  revalidateMesas();
  return { success: "Mesa removida." };
}

export async function updateCompanyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const companyId = await requireCompanyId();
  const name = String(formData.get("name") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name) return { error: "Informe o nome da empresa." };

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      document: document || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
    },
  });

  revalidatePath("/configuracoes");
  return { success: "Dados da empresa salvos." };
}

function revalidateStages() {
  revalidatePath("/configuracoes");
  revalidatePath("/producao");
  revalidatePath("/");
}

export async function createStageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  if (!name) return { error: "Informe o nome da etapa." };

  const companyId = await requireCompanyId();

  const duplicate = await prisma.productionStage.findFirst({ where: { companyId, name }, select: { id: true } });
  if (duplicate) return { error: "Já existe uma etapa com esse nome." };

  const last = await prisma.productionStage.findFirst({ where: { companyId }, orderBy: { position: "desc" }, select: { position: true } });

  await prisma.productionStage.create({
    data: { companyId, name, color: color || null, position: (last?.position ?? 0) + 1 },
  });

  revalidateStages();
  return { success: `Etapa ${name} criada.` };
}

export async function updateStageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const position = Number(formData.get("position") ?? 0);
  const active = String(formData.get("active") ?? "") === "on";
  if (!id || !name) return { error: "Informe o nome da etapa." };

  const companyId = await requireCompanyId();
  const updated = await prisma.productionStage.updateMany({
    where: { id, companyId },
    data: { name, color: color || null, position: Number.isFinite(position) ? position : 0, active },
  });
  if (updated.count === 0) return { error: "Etapa não encontrada." };

  revalidateStages();
  return { success: "Etapa atualizada." };
}

export async function deleteStageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Etapa não encontrada." };

  const companyId = await requireCompanyId();
  const stage = await prisma.productionStage.findFirst({
    where: { id, companyId },
    select: { id: true, _count: { select: { currentOrders: true, toHistory: true } } },
  });
  if (!stage) return { error: "Etapa não encontrada." };
  // So apaga etapa sem pedidos atuais e sem histórico (senao desative).
  if (stage._count.currentOrders > 0 || stage._count.toHistory > 0) {
    return { error: "Esta etapa tem pedidos ou histórico vinculados. Desative-a em vez de excluir." };
  }

  await prisma.productionStage.delete({ where: { id } });

  revalidateStages();
  return { success: "Etapa excluída." };
}
