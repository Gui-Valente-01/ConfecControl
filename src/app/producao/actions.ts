"use server";

import { OrderPriority } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireCompanyId, requireUser } from "@/lib/auth";
import { canManageProduction } from "@/lib/roles";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { pickNextStage } from "@/lib/production";
import { stageNameToOrderStatus } from "@/lib/status";

// Mover etapa / definir responsável é só do Dono e do Gerente (Produção é só leitura).
async function ensureCanManageProduction(): Promise<FormState | null> {
  const user = await requireUser();
  return canManageProduction(user.role) ? null : { error: "Você não tem permissão para alterar a produção." };
}

export async function moveOrderStageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageProduction();
  if (denied) return denied;
  const orderId = String(formData.get("orderId") ?? "");
  const currentStageId = String(formData.get("currentStageId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!orderId || !currentStageId) return { error: "Pedido ou etapa inválidos." };

  const companyId = await requireCompanyId();

  // Garante que o pedido pertence a empresa do usuário logado.
  const order = await prisma.order.findFirst({ where: { id: orderId, companyId }, select: { id: true } });
  if (!order) return { error: "Pedido não encontrado." };

  const currentStage = await prisma.productionStage.findFirst({ where: { id: currentStageId, companyId } });
  if (!currentStage) return { error: "Etapa atual não encontrada." };

  const stages = await prisma.productionStage.findMany({
    where: { companyId: currentStage.companyId },
    select: { id: true, name: true, position: true, active: true },
  });
  const nextStage = pickNextStage(stages, currentStage.position);

  if (!nextStage) return { error: "O pedido já está na última etapa ativa." };

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        currentStageId: nextStage.id,
        status: stageNameToOrderStatus(nextStage.name),
      },
    }),
    prisma.productionHistory.create({
      data: {
        orderId,
        fromStageId: currentStage.id,
        toStageId: nextStage.id,
        note: note || null,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
  return { success: `Pedido movido para ${nextStage.name}.` };
}

const priorities: OrderPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

// Define prioridade, responsável e terceirizada de um pedido na produção.
export async function setOrderProductionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageProduction();
  if (denied) return denied;
  const orderId = String(formData.get("orderId") ?? "");
  const priorityRaw = String(formData.get("priority") ?? "");
  const assignee = String(formData.get("assignee") ?? "").trim();
  const partnerIdRaw = String(formData.get("partnerId") ?? "").trim();
  if (!orderId) return { error: "Pedido não encontrado." };

  const companyId = await requireCompanyId();

  const data: { priority?: OrderPriority; assignee: string | null; partnerId: string | null } = {
    assignee: assignee || null,
    partnerId: null,
  };
  if (priorities.includes(priorityRaw as OrderPriority)) {
    data.priority = priorityRaw as OrderPriority;
  }
  // So aceita terceirizada que pertence a empresa do usuário.
  if (partnerIdRaw) {
    const partner = await prisma.partner.findFirst({ where: { id: partnerIdRaw, companyId }, select: { id: true } });
    data.partnerId = partner?.id ?? null;
  }

  const updated = await prisma.order.updateMany({ where: { id: orderId, companyId }, data });
  if (updated.count === 0) return { error: "Pedido não encontrado." };

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
  return { success: "Dados de produção salvos." };
}
