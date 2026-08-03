// Regras puras de recebimento, sem banco e sem Next, para permitir teste.
//
// Cada linha de pagamento é um RECEBIMENTO: dinheiro que entrou, com data e
// forma. Antes existia uma linha só por pedido, com o valor total, que era
// atualizada a cada pagamento — então não dava para saber quando a entrada
// entrou, nem provar recebimento numa discussão com o cliente.
//
// O saldo é sempre total do pedido menos a soma dos recebimentos. Uma conta só,
// usada pelo financeiro, pela ficha do cliente, pelo portal e pelos relatórios.

import type { PaymentStatus } from "@prisma/client";

export type Receipt = {
  amountInCents: number;
};

export function sumReceipts(receipts: Receipt[]): number {
  return receipts.reduce((total, receipt) => total + Math.max(0, receipt.amountInCents), 0);
}

/** Quanto ainda falta receber. Nunca negativo: pagar a mais não vira dívida. */
export function computeBalance(totalInCents: number, receipts: Receipt[]): number {
  return Math.max(0, totalInCents - sumReceipts(receipts));
}

/** Situação do pedido a partir do que já entrou. */
export function resolveStatusFromReceipts(totalInCents: number, receipts: Receipt[]): PaymentStatus {
  const paid = sumReceipts(receipts);
  if (paid <= 0) return "PENDING";
  if (paid >= totalInCents) return "PAID";
  return "PARTIAL";
}

/**
 * Quanto registrar quando o dono clica em "Recebi".
 *
 * Sem valor digitado, assume que recebeu o saldo inteiro — que é o caso comum.
 * Com valor, aceita o parcial, mas nunca acima do que falta: receber a mais é
 * quase sempre erro de digitação, e deixar passar bagunçaria o relatório.
 */
export function resolveReceiptAmount(balanceInCents: number, requestedInCents: number | null): number {
  if (requestedInCents === null || requestedInCents <= 0) return Math.max(0, balanceInCents);
  return Math.min(requestedInCents, Math.max(0, balanceInCents));
}
