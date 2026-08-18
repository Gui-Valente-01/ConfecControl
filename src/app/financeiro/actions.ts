"use server";

import { revalidatePath } from "next/cache";
import { companyIdWithCapability } from "@/lib/auth";
import { moneyToCents } from "@/lib/format";
import type { FormState } from "@/lib/form-state";
import { computeBalance, resolveReceiptAmount, resolveStatusFromReceipts, sumReceipts } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

function revalidateFinance(orderId: string) {
  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${orderId}`);
  revalidatePath("/financeiro");
  revalidatePath("/relatorios");
}

/**
 * Registra dinheiro que entrou.
 *
 * Cada recebimento vira uma linha própria, com data: é o que permite conferir
 * com o extrato e mostrar ao cliente quando ele pagou. Sem valor informado,
 * assume que recebeu o saldo inteiro, que é o caso comum.
 */
export async function registerPaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Pedido não encontrado." };

  const informado = String(formData.get("amount") ?? "").trim();
  const informadoEmCentavos = informado ? moneyToCents(informado) : null;

  // Registrar e apagar recebimento mexe em dinheiro: exige a capacidade, e
  // nao apenas estar logado. Antes, qualquer pessoa da empresa (inclusive a
  // Producao) podia lancar e excluir pagamento chamando a action direto.
  const companyId = await companyIdWithCapability("finance.write");
  if (!companyId) return { error: "Voce nao tem permissao para mexer em recebimentos." };

  const order = await prisma.order.findFirst({
    where: { id: orderId, companyId },
    select: {
      id: true,
      number: true,
      totalAmountInCents: true,
      paymentMethod: true,
      payments: { select: { amountInCents: true } },
    },
  });
  if (!order) return { error: "Pedido não encontrado." };

  const saldo = computeBalance(order.totalAmountInCents, order.payments);
  if (saldo <= 0) return { error: `O pedido #${order.number} já está quitado.` };

  const valor = resolveReceiptAmount(saldo, informadoEmCentavos);
  if (valor <= 0) return { error: "Informe um valor maior que zero." };

  const recebimentos = [...order.payments, { amountInCents: valor }];

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        orderId: order.id,
        amountInCents: valor,
        status: "PAID",
        method: order.paymentMethod || null,
        note: valor >= saldo ? "Quitação do saldo" : "Recebimento parcial",
        paidAt: new Date(),
      },
    }),
    // paidAmountInCents espelha a soma dos recebimentos: serve às telas que só
    // precisam do total sem carregar o histórico inteiro.
    prisma.order.update({
      where: { id: order.id },
      data: {
        paidAmountInCents: sumReceipts(recebimentos),
        paymentStatus: resolveStatusFromReceipts(order.totalAmountInCents, recebimentos),
      },
    }),
  ]);

  revalidateFinance(order.id);
  return { success: `Recebimento de ${(valor / 100).toFixed(2)} registrado no pedido #${order.number}.` };
}

/** Desfaz um recebimento lançado por engano, devolvendo o saldo. */
export async function deletePaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!paymentId) return { error: "Recebimento não encontrado." };

  // Registrar e apagar recebimento mexe em dinheiro: exige a capacidade, e
  // nao apenas estar logado. Antes, qualquer pessoa da empresa (inclusive a
  // Producao) podia lancar e excluir pagamento chamando a action direto.
  const companyId = await companyIdWithCapability("finance.write");
  if (!companyId) return { error: "Voce nao tem permissao para mexer em recebimentos." };

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, order: { companyId } },
    select: { id: true, orderId: true, order: { select: { totalAmountInCents: true, number: true } } },
  });
  if (!payment) return { error: "Recebimento não encontrado." };

  const restantes = await prisma.payment.findMany({
    where: { orderId: payment.orderId, id: { not: payment.id } },
    select: { amountInCents: true },
  });

  await prisma.$transaction([
    prisma.payment.delete({ where: { id: payment.id } }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: {
        paidAmountInCents: sumReceipts(restantes),
        paymentStatus: resolveStatusFromReceipts(payment.order.totalAmountInCents, restantes),
      },
    }),
  ]);

  revalidateFinance(payment.orderId);
  return { success: `Recebimento removido do pedido #${payment.order.number}.` };
}
