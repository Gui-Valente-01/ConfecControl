// Andamento do pedido e qual é o próximo passo. Sem banco e sem Next, para teste.
//
// O sistema tem 9 situações internas (RECEIVED, CUTTING, SEWING...), o que é
// certo para a produção mas demais para quem só quer saber "em que pé está".
// Aqui elas viram cinco marcos que qualquer pessoa da oficina entende:
//
//   Recebido → Aguardando material → Em produção → Pronto → Entregue
//
// E, principalmente: a tela passa a dizer o que fazer agora, em vez de só
// informar onde o pedido está.

import type { OrderStatus } from "@prisma/client";

export type MarcoFluxo = {
  chave: "recebido" | "material" | "producao" | "pronto" | "entregue";
  rotulo: string;
};

export const MARCOS: MarcoFluxo[] = [
  { chave: "recebido", rotulo: "Recebido" },
  { chave: "material", rotulo: "Aguardando material" },
  { chave: "producao", rotulo: "Em produção" },
  { chave: "pronto", rotulo: "Pronto" },
  { chave: "entregue", rotulo: "Entregue" },
];

const STATUS_PARA_MARCO: Record<OrderStatus, MarcoFluxo["chave"] | null> = {
  RECEIVED: "recebido",
  WAITING_MATERIAL: "material",
  CUTTING: "producao",
  SEWING: "producao",
  EMBROIDERY_PRINT: "producao",
  FINISHING: "producao",
  READY: "pronto",
  DELIVERED: "entregue",
  CANCELED: null,
};

/** Em qual dos cinco marcos o pedido está. -1 = cancelado, fora do fluxo. */
export function posicaoNoFluxo(status: OrderStatus): number {
  const marco = STATUS_PARA_MARCO[status];
  if (!marco) return -1;
  return MARCOS.findIndex((m) => m.chave === marco);
}

export type ProximaAcao = {
  /** Texto do botão. Verbo primeiro: é uma ação, não um rótulo. */
  rotulo: string;
  /** Por que fazer isso agora. Uma linha. */
  explicacao: string;
  destino: "producao" | "financeiro" | "nenhum";
};

export type PedidoParaAcao = {
  status: OrderStatus;
  totalAmountInCents: number;
  paidAmountInCents: number;
};

/**
 * O que fazer com este pedido agora.
 *
 * Uma ação só, a mais provável. Oferecer cinco botões do mesmo tamanho é o
 * mesmo que não orientar ninguém.
 */
export function proximaAcao(pedido: PedidoParaAcao): ProximaAcao {
  const saldo = pedido.totalAmountInCents - pedido.paidAmountInCents;

  if (pedido.status === "CANCELED") {
    return {
      rotulo: "Pedido cancelado",
      explicacao: "Este pedido foi cancelado e não segue na produção.",
      destino: "nenhum",
    };
  }

  if (pedido.status === "DELIVERED") {
    // Entregar sem receber acontece. Enquanto houver saldo, a tarefa é cobrar.
    if (saldo > 0) {
      return {
        rotulo: "Receber o saldo",
        explicacao: "O pedido foi entregue, mas ainda falta receber.",
        destino: "financeiro",
      };
    }
    return {
      rotulo: "Pedido concluído",
      explicacao: "Entregue e pago. Nada pendente.",
      destino: "nenhum",
    };
  }

  if (pedido.status === "READY") {
    return {
      rotulo: "Avisar o cliente e entregar",
      explicacao: "A produção terminou. Combine a retirada ou a entrega.",
      destino: "producao",
    };
  }

  if (pedido.status === "WAITING_MATERIAL") {
    return {
      rotulo: "Separar o material e avançar",
      explicacao: "A produção está parada esperando o material.",
      destino: "producao",
    };
  }

  if (pedido.status === "RECEIVED") {
    return {
      rotulo: "Começar a produção",
      explicacao: "O pedido está registrado e ainda não entrou na produção.",
      destino: "producao",
    };
  }

  return {
    rotulo: "Avançar para a próxima etapa",
    explicacao: "O pedido está sendo feito. Avance quando esta etapa terminar.",
    destino: "producao",
  };
}

/** Situação do pagamento em palavras simples, a partir do saldo de verdade. */
export function situacaoPagamento(
  pedido: PedidoParaAcao,
  prazo: Date | null,
  agora: Date = new Date(),
): { rotulo: string; tom: "bom" | "atencao" | "ruim" } {
  const saldo = pedido.totalAmountInCents - pedido.paidAmountInCents;

  if (saldo <= 0) return { rotulo: "Pago", tom: "bom" };

  const venceu = prazo !== null && prazo < agora;
  if (venceu && pedido.status !== "CANCELED") {
    return { rotulo: "Atrasado", tom: "ruim" };
  }

  if (pedido.paidAmountInCents > 0) return { rotulo: "Parcialmente pago", tom: "atencao" };
  return { rotulo: "Não pago", tom: "atencao" };
}
