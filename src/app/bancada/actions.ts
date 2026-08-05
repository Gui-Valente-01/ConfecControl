"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { planHasFeature } from "@/lib/features";
import type { FormState } from "@/lib/form-state";
import { canAccessRoute } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { storageConfigured, uploadAttachmentToStorage } from "@/lib/storage";
import { explicarRecusa, mesaAceitaEtapa, mesasCompativeis } from "@/lib/mesa-rules";
import { isTaskStageOutdated, pickNextStage } from "@/lib/production";
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

  const [order, mesa, activeTask, todasMesas] = await Promise.all([
    prisma.order.findFirst({
      where: { id: orderId, companyId: user.companyId },
      select: { id: true, number: true, currentStageId: true, currentStage: { select: { name: true } } },
    }),
    prisma.mesa.findFirst({
      where: { id: mesaId, companyId: user.companyId, active: true },
      select: { id: true, name: true, stageId: true, stage: { select: { name: true } } },
    }),
    prisma.bancadaTask.findFirst({ where: { orderId, companyId: user.companyId, status: "PICKED" }, select: { pickedByName: true } }),
    prisma.mesa.findMany({
      where: { companyId: user.companyId, active: true },
      orderBy: { position: "asc" },
      select: { id: true, name: true, stageId: true, stage: { select: { name: true } } },
    }),
  ]);
  if (!order) return { error: "Pedido não encontrado." };
  if (!mesa) return { error: "Mesa inválida." };
  if (activeTask) return { error: `Este pedido já está com ${activeTask.pickedByName} na bancada.` };

  // Mesa de silk faz silk. Sem isso, um pedido ainda no recebimento entrava na
  // bancada de estamparia e o trabalho ia para a etapa errada.
  const mesaComEtapa = { id: mesa.id, name: mesa.name, stageId: mesa.stageId, stageName: mesa.stage?.name ?? null };
  if (!mesaAceitaEtapa(mesaComEtapa, order.currentStageId)) {
    const validas = mesasCompativeis(
      todasMesas.map((m) => ({ id: m.id, name: m.name, stageId: m.stageId, stageName: m.stage?.name ?? null })),
      order.currentStageId,
    );
    return {
      error: explicarRecusa({
        numeroPedido: order.number,
        etapaDoPedido: order.currentStage?.name ?? null,
        mesa: mesaComEtapa,
        mesasValidas: validas,
      }),
      field: "mesaId",
    };
  }

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
      stageName: true,
      order: { select: { number: true, currentStage: { select: { id: true, name: true, position: true } } } },
    },
  });
  if (!task) return { error: "Tarefa não encontrada ou já concluída." };

  const currentStage = task.order.currentStage;

  // A tarefa guarda a etapa de quando a pessoa pegou. Se o pedido andou nesse
  // meio tempo, avançar a partir da etapa nova pularia uma etapa inteira sem
  // ninguém ter feito o serviço. Aqui o trabalho é fechado, mas o pedido não
  // se move: quem move é quem estiver com ele agora.
  if (isTaskStageOutdated(task.stageName, currentStage?.name)) {
    await prisma.bancadaTask.update({
      where: { id: task.id },
      data: { status: "DONE", doneAt: new Date(), noteKind, note: note || null },
    });
    revalidatePath("/bancada");
    return {
      error: `Seu trabalho no pedido #${task.order.number} foi registrado, mas o pedido já saiu da etapa ${task.stageName} enquanto você trabalhava. Ele não foi movido — confira com o responsável.`,
    };
  }
  const stages = currentStage
    ? await prisma.productionStage.findMany({
        where: { companyId: user.companyId },
        select: { id: true, name: true, position: true, active: true },
      })
    : [];
  const nextStage = currentStage ? pickNextStage(stages, currentStage.position) : null;

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

// Tamanho máximo da foto tirada na bancada. É o mesmo limite dos outros anexos.
const MAX_FOTO_BYTES = 8 * 1024 * 1024;

/**
 * Foto tirada pelo funcionário durante a produção.
 *
 * Existe separada do envio de anexo da tela do pedido porque aquela exige
 * permissão de administrar pedidos — que o cargo Produção não tem, e não deve
 * ter. Aqui a permissão é outra e bem mais estreita: a pessoa só anexa no
 * pedido que ELA está com a mão agora, na bancada.
 *
 * Sem isso, o funcionário avisava o problema por WhatsApp e aquilo sumia do
 * pedido: quem fosse ver depois não achava mais.
 */
export async function uploadFotoBancadaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireBancadaUser();
  const taskId = String(formData.get("taskId") ?? "");
  const arquivo = formData.get("foto");

  if (!taskId) return { error: "Trabalho não encontrado." };
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Escolha ou tire uma foto para enviar." };
  }
  if (arquivo.size > MAX_FOTO_BYTES) {
    return { error: "Foto acima de 8 MB. Tire de novo com qualidade menor." };
  }
  if (!storageConfigured()) {
    return { error: "Envio de fotos não está configurado. Avise o dono da confecção." };
  }

  // O escopo: precisa ser um trabalho em andamento, desta empresa. Sem isto,
  // qualquer pessoa da produção anexaria em qualquer pedido da empresa.
  const task = await prisma.bancadaTask.findFirst({
    where: { id: taskId, companyId: user.companyId, status: "PICKED" },
    select: { id: true, orderId: true, order: { select: { number: true } } },
  });
  if (!task) return { error: "Este trabalho não está mais em andamento na bancada." };

  const nomeLimpo = arquivo.name.replace(/[^\w.\-]/g, "_").slice(-60) || "foto.jpg";
  const caminho = `${user.companyId}/${task.orderId}/${randomUUID()}-${nomeLimpo}`;
  const url = await uploadAttachmentToStorage(caminho, await arquivo.arrayBuffer(), arquivo.type || null);
  if (!url) return { error: "Não foi possível enviar a foto. Tente de novo." };

  await prisma.attachment.create({
    data: {
      orderId: task.orderId,
      name: arquivo.name || "Foto da produção",
      url,
      type: arquivo.type || null,
      origem: "BANCADA",
      sentBy: user.name,
    },
  });

  revalidatePath("/bancada");
  revalidatePath(`/pedidos/${task.orderId}`);
  return { success: `Foto anexada ao pedido #${task.order.number}.` };
}
