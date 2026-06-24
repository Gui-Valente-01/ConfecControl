"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PaymentStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currencyToCents, dateInputToDate } from "@/lib/format";
import { requireCompanyId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stageNameToOrderStatus } from "@/lib/status";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export async function uploadAttachmentAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const file = formData.get("file");
  if (!orderId || !(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_UPLOAD_BYTES) return;

  const companyId = await requireCompanyId();
  const order = await prisma.order.findFirst({ where: { id: orderId, companyId }, select: { id: true } });
  if (!order) return;

  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(-60) || "arquivo";
  const fileName = `${randomUUID()}-${safeName}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadDir, fileName), buffer);

  await prisma.attachment.create({
    data: { orderId, name: file.name, url: `/uploads/${fileName}`, type: file.type || null },
  });

  revalidatePath(`/pedidos/${orderId}`);
}

export async function deleteAttachmentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const companyId = await requireCompanyId();
  const attachment = await prisma.attachment.findFirst({
    where: { id, order: { companyId } },
    select: { id: true, url: true, orderId: true },
  });
  if (!attachment) return;

  await prisma.attachment.delete({ where: { id: attachment.id } });

  // Remove o arquivo fisico (ignora erro se não existir).
  if (attachment.url.startsWith("/uploads/")) {
    try {
      await unlink(join(process.cwd(), "public", attachment.url));
    } catch {
      // arquivo já removido
    }
  }

  revalidatePath(`/pedidos/${attachment.orderId}`);
}

type RawItem = {
  productId?: string | null;
  description?: string;
  size?: string;
  color?: string;
  quantity?: number | string;
  unitPrice?: number | string;
};

type ParsedItem = {
  productId: string | null;
  description: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPriceInCents: number;
  totalPriceInCents: number;
};

function parseItems(raw: string): ParsedItem[] {
  let parsed: RawItem[] = [];
  try {
    parsed = JSON.parse(raw) as RawItem[];
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const unitPriceInCents =
        typeof item.unitPrice === "number"
          ? Math.round(item.unitPrice * 100)
          : currencyToCents(String(item.unitPrice ?? ""));
      const description = String(item.description ?? "").trim();
      return {
        productId: item.productId ? String(item.productId) : null,
        description,
        size: item.size ? String(item.size).trim() : null,
        color: item.color ? String(item.color).trim() : null,
        quantity,
        unitPriceInCents,
        totalPriceInCents: unitPriceInCents * quantity,
      };
    })
    .filter((item) => item.quantity > 0 && (item.productId || item.description));
}

function resolvePaymentStatus(paid: number, total: number): PaymentStatus {
  if (paid <= 0) return "PENDING";
  if (paid >= total) return "PAID";
  return "PARTIAL";
}

export async function createOrderAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const deliveryDate = dateInputToDate(String(formData.get("deliveryDate") ?? ""));
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paidAmountInCents = currencyToCents(String(formData.get("paid") ?? ""));
  const internalNotes = String(formData.get("notes") ?? "").trim();
  const items = parseItems(String(formData.get("items") ?? "[]"));

  if (!clientId || items.length === 0) return;

  const companyId = await requireCompanyId();

  // Confirma que o cliente pertence a empresa do usuário.
  const client = await prisma.client.findFirst({ where: { id: clientId, companyId }, select: { id: true } });
  if (!client) return;

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

  const totalAmountInCents = normalizedItems.reduce((sum, item) => sum + item.totalPriceInCents, 0);
  const paymentStatus = resolvePaymentStatus(paidAmountInCents, totalAmountInCents);

  const firstStage = await prisma.productionStage.findFirst({
    where: { companyId, active: true },
    orderBy: { position: "asc" },
  });

  // Cria pedido, itens, pagamento e baixa de estoque numa única transação.
  // O número é gerado dentro da transação; se houver corrida (P2002 no
  // @@unique [companyId, number]), tenta de novo com o próximo número.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
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
            payments: {
              create: {
                amountInCents: totalAmountInCents,
                status: paymentStatus,
                method: paymentMethod || null,
                paidAt: paymentStatus === "PAID" ? new Date() : null,
              },
            },
          },
          select: { id: true },
        });

        await consumeStockForOrder(tx, created.id, number, companyId, normalizedItems);
      });
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        continue; // numero duplicado por corrida: recalcula e tenta de novo
      }
      throw e;
    }
  }

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
  revalidatePath("/financeiro");
  revalidatePath("/estoque");
}

// Baixa automática de materiais conforme a ficha tecnica (BOM) dos produtos do pedido.
// Roda sempre dentro de uma transação (tx) e usa update atômico no banco
// (GREATEST(0, qty - x)) para evitar lost update em baixas concorrentes.
async function consumeStockForOrder(
  tx: Prisma.TransactionClient,
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

  // Soma o consumo por material somando todos os itens do pedido.
  const consumption = new Map<string, number>();
  for (const item of items) {
    if (!item.productId) continue;
    for (const bom of boms) {
      if (bom.productId !== item.productId) continue;
      const qty = Number(bom.quantityPerUnit) * item.quantity;
      consumption.set(bom.materialId, (consumption.get(bom.materialId) ?? 0) + qty);
    }
  }

  for (const [materialId, qty] of consumption) {
    if (qty <= 0) continue;
    const affected = await tx.$executeRaw`
      UPDATE \`materiais\`
      SET \`currentQuantity\` = GREATEST(0, \`currentQuantity\` - ${qty})
      WHERE \`id\` = ${materialId} AND \`companyId\` = ${companyId}`;
    if (affected > 0) {
      await tx.stockMovement.create({
        data: { materialId, orderId, type: "OUT", quantity: qty, note: `Baixa automática do pedido #${orderNumber}` },
      });
    }
  }
}

// Devolve ao estoque tudo que foi baixado automaticamente por este pedido
// e remove os movimentos correspondentes. Usado ao editar ou excluir pedido.
async function reverseStockForOrder(tx: Prisma.TransactionClient, orderId: string) {
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

export async function updateOrderAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const deliveryDate = dateInputToDate(String(formData.get("deliveryDate") ?? ""));
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paidAmountInCents = currencyToCents(String(formData.get("paid") ?? ""));
  const internalNotes = String(formData.get("notes") ?? "").trim();
  const items = parseItems(String(formData.get("items") ?? "[]"));

  if (!id || !clientId || items.length === 0) return;

  const companyId = await requireCompanyId();

  const order = await prisma.order.findFirst({
    where: { id, companyId },
    include: { payments: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) return;

  const client = await prisma.client.findFirst({ where: { id: clientId, companyId }, select: { id: true } });
  if (!client) return;

  const productIds = items.map((item) => item.productId).filter((p): p is string => Boolean(p));
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds }, companyId }, select: { id: true, name: true } })
    : [];
  const productName = new Map(products.map((p) => [p.id, p.name]));

  const normalizedItems = items.map((item) => ({
    ...item,
    description: item.description || (item.productId ? productName.get(item.productId) ?? "Item do pedido" : "Item do pedido"),
  }));

  const totalAmountInCents = normalizedItems.reduce((sum, item) => sum + item.totalPriceInCents, 0);
  const paymentStatus = resolvePaymentStatus(paidAmountInCents, totalAmountInCents);

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });
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
      },
    });

    // Mantem o pagamento principal coerente com o novo total.
    const primaryPayment = order.payments[0];
    if (primaryPayment) {
      await tx.payment.update({
        where: { id: primaryPayment.id },
        data: {
          amountInCents: totalAmountInCents,
          status: paymentStatus,
          method: paymentMethod || null,
          paidAt: paymentStatus === "PAID" ? primaryPayment.paidAt ?? new Date() : null,
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

export async function deleteOrderAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const companyId = await requireCompanyId();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!order) return;
    // Devolve o estoque baixado antes de remover o pedido (os movimentos seriam perdidos).
    await reverseStockForOrder(tx, id);
    await tx.order.delete({ where: { id } });
  });

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
  revalidatePath("/financeiro");
  revalidatePath("/estoque");
  redirect("/pedidos");
}
