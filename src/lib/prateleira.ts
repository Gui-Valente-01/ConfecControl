// Estoque de loja: o pedido pronto vai para a prateleira e sai na entrega.
// Regras puras, sem banco e sem Next, para permitir teste.
//
// Antes o estoque funcionava como almoxarifado de produção: criar o pedido
// descontava as peças na hora, como se elas fossem para a costura. O dono quer
// o contrário, como numa loja: o estoque mostra o que JÁ ESTÁ FEITO.
//
//   pedido criado / em produção  -> estoque não muda
//   pedido chega em "Pronto"     -> as peças ENTRAM na prateleira
//   pedido vai para "Entregue"   -> as peças SAEM (foram para o cliente)
//
// A conta é sempre a mesma, rode quando rodar: "o que este pedido deveria ter
// na prateleira agora" menos "o que ele já pôs lá". A diferença vira entrada ou
// saída. Por isso chamar duas vezes não duplica nada, e editar um pedido
// pronto acerta a prateleira sozinho.
//
// Só entra peça do catálogo do tipo "peça própria". Serviço na peça do cliente
// não é mercadoria da confecção e não mexe no estoque dela.

import type { OrderStatus } from "@prisma/client";

export type ItemParaPrateleira = {
  productId: string | null;
  quantity: number;
};

export type MovimentoDoPedido = {
  productId: string | null;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  note?: string | null;
};

/**
 * Nota da baixa que a versão antiga fazia ao CRIAR o pedido. Essa saída não
 * é da prateleira: é o almoxarifado de produção que existia antes. Contá-la
 * aqui faria o pedido antigo "dever" peças à prateleira — ele entraria em
 * Pronto e nunca sairia na entrega.
 */
const NOTA_DA_BAIXA_ANTIGA = "Baixa automática do pedido";

export type AjustePrateleira = {
  productId: string;
  type: "IN" | "OUT";
  quantity: number;
};

export type PosicaoNaProducao = {
  /** Posição da etapa em que o pedido está. */
  atual: number | null;
  /** Posição da primeira etapa "Pronto" da empresa. */
  pronto: number | null;
};

/**
 * O pedido fica na prateleira do momento em que fica pronto até ser entregue.
 *
 * Isso inclui etapa que o dono criou DEPOIS de "Pronto" (Embalagem, Conferência):
 * o nome dela não diz "pronto", mas a peça já está feita. Sem olhar a posição,
 * o pedido sairia da prateleira ao passar por ali, antes de o cliente levar.
 */
export function ficaNaPrateleira(status: OrderStatus, posicao: PosicaoNaProducao = { atual: null, pronto: null }): boolean {
  if (status === "DELIVERED" || status === "CANCELED") return false;
  if (status === "READY") return true;
  return posicao.atual !== null && posicao.pronto !== null && posicao.atual > posicao.pronto;
}

/**
 * Quantas unidades de cada peça própria o pedido tem.
 *
 * Duas linhas da mesma peça (tamanhos diferentes) somam. Item sem peça do
 * catálogo, ou de peça que é serviço na peça do cliente, fica de fora.
 */
export function pecasDoPedido(itens: ItemParaPrateleira[], pecaPropria: (productId: string) => boolean): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const item of itens) {
    if (!item.productId || item.quantity <= 0 || !pecaPropria(item.productId)) continue;
    mapa.set(item.productId, (mapa.get(item.productId) ?? 0) + item.quantity);
  }
  return mapa;
}

/**
 * O que este pedido tem na prateleira agora: entradas menos saídas DELE.
 *
 * Só olha movimento amarrado ao pedido. Entrada e acerto feitos à mão na tela
 * de estoque não têm pedido e não entram aqui.
 */
export function saldoDoPedidoNaPrateleira(movimentos: MovimentoDoPedido[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const m of movimentos) {
    if (!m.productId || m.type === "ADJUSTMENT") continue;
    if (m.type === "OUT" && m.note?.startsWith(NOTA_DA_BAIXA_ANTIGA)) continue;
    const sinal = m.type === "IN" ? 1 : -1;
    mapa.set(m.productId, (mapa.get(m.productId) ?? 0) + sinal * m.quantity);
  }
  for (const [id, qtd] of mapa) if (qtd <= 0) mapa.delete(id);
  return mapa;
}

/**
 * O que lançar para a prateleira ficar certa.
 *
 * `deveria` é o que o pedido deveria ter lá agora (as peças dele, se está
 * pronto; nada, se não está). `tem` é o que ele já pôs. Sai uma lista de
 * entradas e saídas, em ordem estável, sem linha zerada.
 */
export function planejarPrateleira(deveria: Map<string, number>, tem: Map<string, number>): AjustePrateleira[] {
  const ids = [...new Set([...deveria.keys(), ...tem.keys()])].sort();
  const ajustes: AjustePrateleira[] = [];
  for (const productId of ids) {
    const diferenca = (deveria.get(productId) ?? 0) - (tem.get(productId) ?? 0);
    if (diferenca > 0) ajustes.push({ productId, type: "IN", quantity: diferenca });
    else if (diferenca < 0) ajustes.push({ productId, type: "OUT", quantity: -diferenca });
  }
  return ajustes;
}

export type MotivoPrateleira = "etapa" | "edicao" | "exclusao";

/** Texto do histórico de estoque, para quem for conferir depois. */
export function notaDoAjuste(ajuste: AjustePrateleira, numeroPedido: number, status: OrderStatus, motivo: MotivoPrateleira): string {
  if (motivo === "exclusao") return `Pedido #${numeroPedido} excluído — saiu da prateleira`;
  if (motivo === "edicao") return `Pedido #${numeroPedido} alterado — prateleira ajustada`;
  if (ajuste.type === "IN") return `Pedido #${numeroPedido} ficou pronto — entrou na prateleira`;
  if (status === "DELIVERED") return `Pedido #${numeroPedido} entregue — saiu da prateleira`;
  if (status === "CANCELED") return `Pedido #${numeroPedido} cancelado — saiu da prateleira`;
  return `Pedido #${numeroPedido} saiu de Pronto — voltou para a produção`;
}
