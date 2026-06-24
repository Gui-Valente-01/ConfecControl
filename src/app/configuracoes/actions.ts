"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

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

export async function updateStageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const position = Number(formData.get("position") ?? 0);
  const active = String(formData.get("active") ?? "") === "on";
  if (!id || !name) return;

  const companyId = await requireCompanyId();
  await prisma.productionStage.updateMany({
    where: { id, companyId },
    data: { name, color: color || null, position: Number.isFinite(position) ? position : 0, active },
  });

  revalidateStages();
}

export async function deleteStageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const companyId = await requireCompanyId();
  const stage = await prisma.productionStage.findFirst({
    where: { id, companyId },
    select: { id: true, _count: { select: { currentOrders: true, toHistory: true } } },
  });
  // So apaga etapa sem pedidos atuais e sem histórico (senao desative).
  if (!stage || stage._count.currentOrders > 0 || stage._count.toHistory > 0) return;

  await prisma.productionStage.delete({ where: { id } });

  revalidateStages();
}
