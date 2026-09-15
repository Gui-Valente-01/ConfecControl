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

export type PlanoDaEntrada =
  | { acao: "manter" }
  | { acao: "atualizar"; valor: number }
  | { acao: "apagar" }
  | { acao: "criar"; valor: number }
  | { erro: string };

/**
 * O que fazer com a entrada quando alguém edita o pedido.
 *
 * O campo "já pago" da edição mostra o TOTAL pago. Só a entrada (o primeiro
 * recebimento) pode ser mexida por ali; o que entrou depois é histórico de
 * caixa e só sai pelo Financeiro.
 *
 * Por isso digitar menos do que já entrou depois da entrada é recusado. Antes
 * o sistema aceitava, gravava o número digitado no pedido e mantinha os
 * recebimentos — e o relatório e o financeiro passavam a discordar.
 *
 * `recebimentos` vem na ordem em que foram lançados.
 *
 * `pagoMostradoInCents` é o valor que a tela de edição mostrava ao abrir.
 * Quem não mexeu no campo não mexe em dinheiro nenhum. E se entrou um
 * recebimento enquanto a tela estava aberta, o valor da tela está velho:
 * aplicá-lo encolheria a entrada e sumiria com dinheiro que entrou.
 */
export function planejarEdicaoDaEntrada(
  recebimentos: Receipt[],
  pagoInformadoInCents: number,
  pagoMostradoInCents: number | null = null,
): PlanoDaEntrada {
  if (pagoMostradoInCents !== null) {
    if (pagoInformadoInCents === pagoMostradoInCents) return { acao: "manter" };
    if (sumReceipts(recebimentos) !== pagoMostradoInCents) {
      return {
        erro: "Entrou um recebimento enquanto esta tela estava aberta, e o valor pago mudou. Abra o pedido de novo para editar com o valor atual.",
      };
    }
  }

  const [entrada, ...depois] = recebimentos;
  const recebidoDepois = sumReceipts(depois);

  if (pagoInformadoInCents < recebidoDepois) {
    const reais = (recebidoDepois / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return {
      erro: `Já entraram ${reais} depois da entrada. O valor pago não pode ficar abaixo disso: para corrigir um recebimento, apague-o no Financeiro.`,
    };
  }

  const novaEntrada = pagoInformadoInCents - recebidoDepois;
  if (!entrada) return novaEntrada > 0 ? { acao: "criar", valor: novaEntrada } : { acao: "manter" };
  if (novaEntrada === entrada.amountInCents) return { acao: "manter" };
  return novaEntrada > 0 ? { acao: "atualizar", valor: novaEntrada } : { acao: "apagar" };
}
