"use server";

import { OrderPriority } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stageNameToOrderStatus } from "@/lib/status";

export async function moveOrderStageAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const currentStageId = String(formData.get("currentStageId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!orderId || !currentStageId) return;

  const companyId = await requireCompanyId();

  // Garante que o pedido pertence a empresa do usuário logado.
  const order = await prisma.order.findFirst({ where: { id: orderId, companyId }, select: { id: true } });
  if (!order) return;

  const currentStage = await prisma.productionStage.findFirst({ where: { id: currentStageId, companyId } });
  if (!currentStage) return;

  const nextStage = await prisma.productionStage.findFirst({
    where: {
      companyId: currentStage.companyId,
      active: true,
      position: { gt: currentStage.position },
    },
    orderBy: { position: "asc" },
  });

  if (!nextStage) return;

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
}

const priorities: OrderPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

// Define prioridade, responsável e terceirizada de um pedido na produção.
export async function setOrderProductionAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const priorityRaw = String(formData.get("priority") ?? "");
  const assignee = String(formData.get("assignee") ?? "").trim();
  const partnerIdRaw = String(formData.get("partnerId") ?? "").trim();
  if (!orderId) return;

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

  await prisma.order.updateMany({ where: { id: orderId, companyId }, data });

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
}
