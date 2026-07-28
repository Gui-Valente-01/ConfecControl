"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { planHasFeature } from "@/lib/features";
import type { FormState } from "@/lib/form-state";
import { canAccessRoute } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { stageNameToOrderStatus } from "@/lib/status";

const noteKinds = ["NONE", "SHORTAGE", "SURPLUS", "INFO"];

async function requireBancadaUser() {
  const user = await requireUser();
  if (!canAccessRoute(user.role, "/bancada")) redirect("/");
  if (!planHasFeature(user.features, "bancada")) redirect("/");
  return user;
}

// O funcionário "pega" um pedido numa mesa (fica registrado quem pegou).
export async function pickOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireBancadaUser();
  const orderId = String(formData.get("orderId") ?? "");
  const mesaId = String(formData.get("mesaId") ?? "").trim();

  if (!orderId) return { error: "Pedido não encontrado." };
  if (!mesaId) return { error: "Escolha a mesa antes de pegar o pedido." };

  const [order, mesa, activeTask] = await Promise.all([
    prisma.order.findFirst({
      where: { id: orderId, companyId: user.companyId },
      select: { id: true, number: true, currentStage: { select: { name: true } } },
    }),
    prisma.mesa.findFirst({ where: { id: mesaId, companyId: user.companyId, active: true }, select: { id: true } }),
    prisma.bancadaTask.findFirst({ where: { orderId, companyId: user.companyId, status: "PICKED" }, select: { pickedByName: true } }),
  ]);
  if (!order) return { error: "Pedido não encontrado." };
  if (!mesa) return { error: "Mesa inválida." };
  if (activeTask) return { error: `Este pedido já está com ${activeTask.pickedByName} na bancada.` };

  await prisma.bancadaTask.create({
    data: {
      companyId: user.companyId,
      orderId,
      mesaId,
      pickedById: user.id,
      pickedByName: user.name,
      status: "PICKED",
      // Guarda a etapa trabalhada agora; concluir move o pedido para a seguinte.
      stageName: order.currentStage?.name ?? null,
    },
  });

  revalidatePath("/bancada");
  return { success: `Você pegou o pedido #${order.number}.` };
}

// Conclui o trabalho na bancada, registra falta/sobra e empurra o pedido para a
// proxima etapa do quadro: e assim que a producao anda. Sem isso o pedido caia
// de volta na fila de "pegar trabalho" como se nada tivesse sido feito.
export async function completeTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireBancadaUser();
  const id = String(formData.get("id") ?? "");
  const noteKindRaw = String(formData.get("noteKind") ?? "NONE");
  const note = String(formData.get("note") ?? "").trim();
  if (!id) return { error: "Tarefa não encontrada." };

  const noteKind = noteKinds.includes(noteKindRaw) ? noteKindRaw : "NONE";

  const task = await prisma.bancadaTask.findFirst({
    where: { id, companyId: user.companyId, status: "PICKED" },
    select: {
      id: true,
      orderId: true,
      order: { select: { number: true, currentStage: { select: { id: true, position: true } } } },
    },
  });
  if (!task) return { error: "Tarefa não encontrada ou já concluída." };

  const currentStage = task.order.currentStage;
  const nextStage = currentStage
    ? await prisma.productionStage.findFirst({
        where: { companyId: user.companyId, active: true, position: { gt: currentStage.position } },
        orderBy: { position: "asc" },
        select: { id: true, name: true },
      })
    : null;

  const doneData = { status: "DONE", doneAt: new Date(), noteKind, note: note || null };

  // Ultima etapa (ou pedido sem etapa): so conclui, nao tem para onde mover.
  if (!currentStage || !nextStage) {
    await prisma.bancadaTask.update({ where: { id: task.id }, data: doneData });
    revalidatePath("/bancada");
    return { success: `Pedido #${task.order.number} concluído.` };
  }

  await prisma.$transaction([
    prisma.bancadaTask.update({ where: { id: task.id }, data: doneData }),
    prisma.order.update({
      where: { id: task.orderId },
      data: { currentStageId: nextStage.id, status: stageNameToOrderStatus(nextStage.name) },
    }),
    prisma.productionHistory.create({
      data: {
        orderId: task.orderId,
        fromStageId: currentStage.id,
        toStageId: nextStage.id,
        note: note ? `Concluído na bancada por ${user.name} - ${note}` : `Concluído na bancada por ${user.name}`,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
  revalidatePath("/bancada");
  return { success: `Pedido #${task.order.number} concluído e movido para ${nextStage.name}.` };
}

// Libera o pedido (desfaz o "peguei"), caso tenha pego por engano.
export async function releaseTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireBancadaUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Tarefa não encontrada." };

  const deleted = await prisma.bancadaTask.deleteMany({ where: { id, companyId: user.companyId, status: "PICKED" } });
  if (deleted.count === 0) return { error: "Tarefa não encontrada." };

  revalidatePath("/bancada");
  return { success: "Pedido liberado." };
}
