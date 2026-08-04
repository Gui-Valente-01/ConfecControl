// Filtros da lista de pedidos. Sem banco e sem Next, para permitir teste.
//
// Existem para o Início virar tela de trabalho: cada aviso lá ("3 pedidos
// atrasados") é um link que abre a lista já filtrada. Antes o aviso levava para
// a lista inteira, e a pessoa tinha que caçar quais eram os três.
//
// O nome do filtro vai na URL (?filtro=atrasados), então é ele que a pessoa vê
// e pode guardar nos favoritos. Por isso são palavras em português, e não os
// códigos internos do banco.

import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { isOrderLate } from "@/lib/status";

export const FILTROS_PEDIDO = ["atrasados", "hoje", "material", "producao", "prontos", "receber"] as const;

export type FiltroPedido = (typeof FILTROS_PEDIDO)[number];

const FILTROS = new Set<string>(FILTROS_PEDIDO);

export function eFiltroPedido(valor: string | null | undefined): valor is FiltroPedido {
  return Boolean(valor && FILTROS.has(valor));
}

/** Título e explicação de cada filtro, para a tela dizer o que está mostrando. */
const DESCRICOES: Record<FiltroPedido, { titulo: string; explicacao: string; vazio: string }> = {
  atrasados: {
    titulo: "Pedidos atrasados",
    explicacao: "O prazo combinado já passou e o pedido ainda não foi entregue.",
    vazio: "Nenhum pedido atrasado. Tudo dentro do prazo.",
  },
  hoje: {
    titulo: "Entregas de hoje",
    explicacao: "Pedidos com prazo para hoje.",
    vazio: "Nenhuma entrega marcada para hoje.",
  },
  material: {
    titulo: "Aguardando material",
    explicacao: "A produção está parada esperando material chegar ou ser separado.",
    vazio: "Nenhum pedido parado por falta de material.",
  },
  producao: {
    titulo: "Em produção",
    explicacao: "Pedidos que já estão sendo feitos.",
    vazio: "Nenhum pedido em produção agora.",
  },
  prontos: {
    titulo: "Prontos para entrega",
    explicacao: "A produção terminou. Falta avisar o cliente e entregar.",
    vazio: "Nenhum pedido pronto esperando entrega.",
  },
  receber: {
    titulo: "Falta receber",
    explicacao: "Pedidos com valor em aberto, no todo ou em parte.",
    vazio: "Nenhum pedido com valor em aberto.",
  },
};

export function descreverFiltro(filtro: FiltroPedido) {
  return DESCRICOES[filtro];
}

export type PedidoFiltravel = {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryDate: Date | null;
  totalAmountInCents: number;
  paidAmountInCents: number;
};

/** Etapas que contam como "sendo feito agora". */
const EM_PRODUCAO: OrderStatus[] = ["CUTTING", "SEWING", "EMBROIDERY_PRINT", "FINISHING"];

function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/**
 * Um pedido entra no filtro?
 *
 * Cancelado nunca entra em lista de trabalho: não há o que fazer com ele.
 * Entregue também sai de tudo, menos de "falta receber" — entregar sem receber
 * acontece, e esse dinheiro não pode sumir da vista.
 */
export function pedidoCasaFiltro(
  pedido: PedidoFiltravel,
  filtro: FiltroPedido,
  agora: Date = new Date(),
): boolean {
  if (pedido.status === "CANCELED") return false;

  switch (filtro) {
    case "atrasados":
      return isOrderLate(pedido.deliveryDate, pedido.status, agora);

    case "hoje":
      if (!pedido.deliveryDate) return false;
      if (pedido.status === "DELIVERED") return false;
      return mesmoDia(pedido.deliveryDate, agora);

    case "material":
      return pedido.status === "WAITING_MATERIAL";

    case "producao":
      return EM_PRODUCAO.includes(pedido.status);

    case "prontos":
      return pedido.status === "READY";

    case "receber":
      // Vale o saldo de verdade, e não só a etiqueta de situação: pedido
      // marcado como pago mas com saldo aberto continua sendo dinheiro a receber.
      return pedido.totalAmountInCents - pedido.paidAmountInCents > 0;
  }
}

export function filtrarPedidos<T extends PedidoFiltravel>(
  pedidos: T[],
  filtro: FiltroPedido | null,
  agora: Date = new Date(),
): T[] {
  if (!filtro) return pedidos;
  return pedidos.filter((pedido) => pedidoCasaFiltro(pedido, filtro, agora));
}
