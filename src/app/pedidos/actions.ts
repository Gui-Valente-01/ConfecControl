"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { OrderPriority, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dateInputToDate, moneyToCents } from "@/lib/format";
import { requireCompanyId, requireUser } from "@/lib/auth";
import { canManageOrders } from "@/lib/roles";
import type { FormState } from "@/lib/form-state";
import { parseItems, parseServices, resolvePaymentStatus, type ParsedItem } from "@/lib/order-items";
import { computeStockConsumption } from "@/lib/production";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { stageNameToOrderStatus } from "@/lib/status";
import { removeAttachmentFromStorage, storageConfigured, uploadAttachmentToStorage } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

const orderPriorities: OrderPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

// Bloqueia cargos sem permissão de gerir pedidos (ex.: Produção é só leitura).
async function ensureCanManageOrders(): Promise<FormState | null> {
  const user = await requireUser();
  return canManageOrders(user.role) ? null : { error: "Você não tem permissão para esta ação." };
}

// Prioridade (preferência) do pedido: só o Dono (ADMIN) ou o Gerente (MANAGER) altera.
export async function setOrderPriorityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return { error: "Apenas o dono ou o gerente altera a prioridade." };
  }
  const id = String(formData.get("id") ?? "");
  const priorityRaw = String(formData.get("priority") ?? "");
  if (!id || !orderPriorities.includes(priorityRaw as OrderPriority)) return { error: "Prioridade inválida." };

  const updated = await prisma.order.updateMany({
    where: { id, companyId: user.companyId },
    data: { priority: priorityRaw as OrderPriority },
  });
  if (updated.count === 0) return { error: "Pedido não encontrado." };

  revalidatePath("/pedidos");
  revalidatePath("/producao");
  revalidatePath("/bancada");
  return { success: "Prioridade atualizada." };
}

export async function uploadAttachmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageOrders();
  if (denied) return denied;
  const orderId = String(formData.get("orderId") ?? "");
  const file = formData.get("file");
  if (!orderId || !(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo para enviar." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Arquivo acima de 8 MB. Envie um arquivo menor." };
  if (!storageConfigured()) {
    return { error: "Armazenamento de anexos não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY." };
  }

  const companyId = await requireCompanyId();
  const order = await prisma.order.findFirst({ where: { id: orderId, companyId }, select: { id: true } });
  if (!order) return { error: "Pedido não encontrado." };

  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(-60) || "arquivo";
  const path = `${companyId}/${orderId}/${randomUUID()}-${safeName}`;
  const url = await uploadAttachmentToStorage(path, await file.arrayBuffer(), file.type || null);
  if (!url) return { error: "Falha ao enviar o arquivo. Tente novamente." };

  await prisma.attachment.create({
    data: { orderId, name: file.name, url, type: file.type || null },
  });

  revalidatePath(`/pedidos/${orderId}`);
  return { success: "Anexo enviado." };
}

export async function deleteAttachmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageOrders();
  if (denied) return denied;
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Anexo não encontrado." };

  const companyId = await requireCompanyId();
  const attachment = await prisma.attachment.findFirst({
    where: { id, order: { companyId } },
    select: { id: true, url: true, orderId: true },
  });
  if (!attachment) return { error: "Anexo não encontrado." };

  await prisma.attachment.delete({ where: { id: attachment.id } });

  if (attachment.url.startsWith("/uploads/")) {
    // Anexo antigo salvo no filesystem local, antes da migração para o Storage.
    try {
      await unlink(join(process.cwd(), "public", attachment.url));
    } catch {
      // arquivo já removido
    }
  } else {
    await removeAttachmentFromStorage(attachment.url);
  }

  revalidatePath(`/pedidos/${attachment.orderId}`);
  return { success: "Anexo removido." };
}

export async function createOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageOrders();
  if (denied) return denied;
  const clientId = String(formData.get("clientId") ?? "");
  const deliveryDate = dateInputToDate(String(formData.get("deliveryDate") ?? ""));
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paidAmountInCents = moneyToCents(String(formData.get("paid") ?? ""));
  const internalNotes = String(formData.get("notes") ?? "").trim();
  const items = parseItems(String(formData.get("items") ?? "[]"));
  const services = parseServices(String(formData.get("services") ?? "[]"));

  if (!clientId || items.length === 0) return { error: "Informe o cliente e ao menos um item do pedido." };

  const companyId = await requireCompanyId();

  // Confirma que o cliente pertence a empresa do usuário.
  const client = await prisma.client.findFirst({ where: { id: clientId, companyId }, select: { id: true } });
  if (!client) return { error: "Cliente inválido." };

  // Completa descrição de itens que vieram so com produto selecionado (apenas produtos da empresa).
  const productIds = items.map((item) => item.productId).filter((id): id is string => Boolean(id));
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds }, companyId }, select: { id: true, name: true } })
    : [];
  const productName = new Map(products.map((p) => [p.id, p.name]));

  const normalizedItems = items.map((item) => ({
    ...item,
    description: item.description || (item.productId ? productName.get(item.productId) ?? "Item do pedido" : "Item do pedido"),
  }));

  // Serviço é receita: entra no total que o cliente paga.
  const servicesTotalInCents = services.reduce((sum, service) => sum + service.priceInCents, 0);
  const totalAmountInCents =
    normalizedItems.reduce((sum, item) => sum + item.totalPriceInCents, 0) + servicesTotalInCents;
  const paymentStatus = resolvePaymentStatus(paidAmountInCents, totalAmountInCents);

  const firstStage = await prisma.productionStage.findFirst({
    where: { companyId, active: true },
    orderBy: { position: "asc" },
  });

  // Cria pedido, itens, pagamento e baixa de estoque numa única transação.
  // O número é gerado dentro da transação; se houver corrida (P2002 no
  // @@unique [companyId, number]), tenta de novo com o próximo número.
  let createdNumber: number | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      createdNumber = await prisma.$transaction(async (tx) => {
        const last = await tx.order.findFirst({
          where: { companyId },
          orderBy: { number: "desc" },
          select: { number: true },
        });
        const number = (last?.number ?? 1000) + 1;

        const created = await tx.order.create({
          data: {
            companyId,
            clientId,
            number,
            deliveryDate,
            status: firstStage ? stageNameToOrderStatus(firstStage.name) : "RECEIVED",
            paymentStatus,
            totalAmountInCents,
            paidAmountInCents,
            paymentMethod: paymentMethod || null,
            internalNotes: internalNotes || null,
            currentStageId: firstStage?.id,
            items: {
              create: normalizedItems.map((item) => ({
                productId: item.productId,
                description: item.description,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unitPriceInCents: item.unitPriceInCents,
                totalPriceInCents: item.totalPriceInCents,
              })),
            },
            services: {
              create: services.map((service) => ({
                name: service.name,
                priceInCents: service.priceInCents,
              })),
            },
            // Só há pagamento se entrou dinheiro. A entrada é um recebimento
            // com data própria, e não a cobrança do total do pedido.
            payments:
              paidAmountInCents > 0
                ? {
                    create: {
                      amountInCents: paidAmountInCents,
                      status: "PAID",
                      method: paymentMethod || null,
                      note: "Entrada do pedido",
                      paidAt: new Date(),
                    },
                  }
                : undefined,
          },
          select: { id: true },
        });

        await consumeStockForOrder(tx, created.id, number, companyId, normalizedItems);
        return number;
      });
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        continue; // numero duplicado por corrida: recalcula e tenta de novo
      }
      throw e;
    }
  }

  if (createdNumber === null) {
    return { error: "Não foi possível gerar o número do pedido. Tente novamente." };
  }

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
  revalidatePath("/financeiro");
  revalidatePath("/estoque");
  return { success: `Pedido #${createdNumber} criado.` };
}

// Baixa automática de materiais conforme a ficha tecnica (BOM) dos produtos do pedido.
// Roda sempre dentro de uma transação (tx) e usa update atômico no banco
// (GREATEST(0, qty - x)) para evitar lost update em baixas concorrentes.
async function consumeStockForOrder(
  tx: TransactionClient,
  orderId: string,
  orderNumber: number,
  companyId: string,
  items: ParsedItem[],
) {
  const productIds = Array.from(new Set(items.map((item) => item.productId).filter((id): id is string => Boolean(id))));
  if (productIds.length === 0) return;

  const boms = await tx.productMaterial.findMany({
    where: { productId: { in: productIds }, material: { companyId } },
    select: { productId: true, materialId: true, quantityPerUnit: true },
  });
  if (boms.length === 0) return;

  const consumption = computeStockConsumption(
    items,
    boms.map((bom) => ({
      productId: bom.productId,
      materialId: bom.materialId,
      quantityPerUnit: Number(bom.quantityPerUnit),
    })),
  );

  for (const [materialId, qty] of consumption) {
    if (qty <= 0) continue;
    const affected = await tx.$executeRaw`
      UPDATE "materiais"
      SET "currentQuantity" = GREATEST(0, "currentQuantity" - ${qty})
      WHERE "id" = ${materialId} AND "companyId" = ${companyId}`;
    if (affected > 0) {
      await tx.stockMovement.create({
        data: { materialId, orderId, type: "OUT", quantity: qty, note: `Baixa automática do pedido #${orderNumber}` },
      });
    }
  }
}

// Devolve ao estoque tudo que foi baixado automaticamente por este pedido
// e remove os movimentos correspondentes. Usado ao editar ou excluir pedido.
async function reverseStockForOrder(tx: TransactionClient, orderId: string) {
  const movements = await tx.stockMovement.findMany({
    where: { orderId, type: "OUT" },
    select: { materialId: true, quantity: true },
  });
  for (const m of movements) {
    await tx.material.update({
      where: { id: m.materialId },
      data: { currentQuantity: { increment: m.quantity } },
    });
  }
  await tx.stockMovement.deleteMany({ where: { orderId, type: "OUT" } });
}

export async function updateOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageOrders();
  if (denied) return denied;
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const deliveryDate = dateInputToDate(String(formData.get("deliveryDate") ?? ""));
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paidAmountInCents = moneyToCents(String(formData.get("paid") ?? ""));
  const internalNotes = String(formData.get("notes") ?? "").trim();
  const items = parseItems(String(formData.get("items") ?? "[]"));
  const services = parseServices(String(formData.get("services") ?? "[]"));

  if (!id || !clientId || items.length === 0) return { error: "Informe o cliente e ao menos um item do pedido." };

  const companyId = await requireCompanyId();

  const order = await prisma.order.findFirst({
    where: { id, companyId },
    include: { payments: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) return { error: "Pedido não encontrado." };

  const client = await prisma.client.findFirst({ where: { id: clientId, companyId }, select: { id: true } });
  if (!client) return { error: "Cliente inválido." };

  const productIds = items.map((item) => item.productId).filter((p): p is string => Boolean(p));
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds }, companyId }, select: { id: true, name: true } })
    : [];
  const productName = new Map(products.map((p) => [p.id, p.name]));

  const normalizedItems = items.map((item) => ({
    ...item,
    description: item.description || (item.productId ? productName.get(item.productId) ?? "Item do pedido" : "Item do pedido"),
  }));

  // Serviço é receita: entra no total que o cliente paga.
  const servicesTotalInCents = services.reduce((sum, service) => sum + service.priceInCents, 0);
  const totalAmountInCents =
    normalizedItems.reduce((sum, item) => sum + item.totalPriceInCents, 0) + servicesTotalInCents;
  const paymentStatus = resolvePaymentStatus(paidAmountInCents, totalAmountInCents);

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.orderService.deleteMany({ where: { orderId: id } });
    await tx.order.update({
      where: { id },
      data: {
        clientId,
        deliveryDate,
        paymentStatus,
        totalAmountInCents,
        paidAmountInCents,
        paymentMethod: paymentMethod || null,
        internalNotes: internalNotes || null,
        items: {
          create: normalizedItems.map((item) => ({
            productId: item.productId,
            description: item.description,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            unitPriceInCents: item.unitPriceInCents,
            totalPriceInCents: item.totalPriceInCents,
          })),
        },
        services: {
          create: services.map((service) => ({
            name: service.name,
            priceInCents: service.priceInCents,
          })),
        },
      },
    });

    // O campo "entrada" da edição mexe só no PRIMEIRO recebimento — o da entrada.
    // Recebimentos posteriores são histórico de caixa e não podem ser reescritos
    // por quem só voltou ao pedido para ajustar um prazo.
    const [entrada, ...posteriores] = order.payments;
    const recebidoDepois = posteriores.reduce((sum, p) => sum + p.amountInCents, 0);
    const novaEntrada = Math.max(0, paidAmountInCents - recebidoDepois);

    if (entrada && novaEntrada > 0) {
      await tx.payment.update({
        where: { id: entrada.id },
        data: { amountInCents: novaEntrada, method: paymentMethod || entrada.method },
      });
    } else if (entrada && novaEntrada === 0) {
      // Entrada zerada na edição: some do histórico, porque aquele dinheiro não entrou.
      await tx.payment.delete({ where: { id: entrada.id } });
    } else if (!entrada && novaEntrada > 0) {
      await tx.payment.create({
        data: {
          orderId: id,
          amountInCents: novaEntrada,
          status: "PAID",
          method: paymentMethod || null,
          note: "Entrada do pedido",
          paidAt: new Date(),
        },
      });
    }

    // Recalcula o estoque: devolve a baixa antiga e aplica a nova conforme os itens atuais.
    await reverseStockForOrder(tx, id);
    await consumeStockForOrder(tx, id, order.number, companyId, normalizedItems);
  });

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/producao");
  revalidatePath("/financeiro");
  redirect(`/pedidos/${id}`);
}

export async function deleteOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageOrders();
  if (denied) return denied;
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Pedido não encontrado." };

  const companyId = await requireCompanyId();

  const attachmentUrls = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id, companyId },
      select: { id: true, attachments: { select: { url: true } } },
    });
    if (!order) return null;
    // Devolve o estoque baixado antes de remover o pedido (os movimentos seriam perdidos).
    await reverseStockForOrder(tx, id);
    await tx.order.delete({ where: { id } });
    return order.attachments.map((a) => a.url);
  });
  if (attachmentUrls === null) return { error: "Pedido não encontrado." };

  // Depois do commit, remove do Storage os arquivos dos anexos (melhor esforço;
  // anexos legados em /uploads/ não existem na Vercel e são ignorados).
  for (const url of attachmentUrls) {
    if (!url.startsWith("/uploads/")) await removeAttachmentFromStorage(url);
  }

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
  revalidatePath("/financeiro");
  revalidatePath("/estoque");
  redirect("/pedidos");
}
