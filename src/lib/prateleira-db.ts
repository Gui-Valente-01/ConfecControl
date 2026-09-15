// Aplica no banco a regra da prateleira (src/lib/prateleira.ts).
//
// Roda SEMPRE dentro da transação que mudou o pedido — mudança de etapa,
// edição ou exclusão —, para o estoque nunca ficar meio atualizado: ou a etapa
// muda e a prateleira acompanha, ou nada muda.

import type { TransactionClient } from "@/lib/prisma";
import { stageNameToOrderStatus } from "@/lib/status";
import {
  ficaNaPrateleira,
  notaDoAjuste,
  pecasDoPedido,
  planejarPrateleira,
  saldoDoPedidoNaPrateleira,
  type AjustePrateleira,
  type MotivoPrateleira,
} from "@/lib/prateleira";

/**
 * Deixa a prateleira do pedido igual ao que ela deveria ser agora.
 *
 * Com `remover`, o pedido sai da prateleira de qualquer jeito — é o caso da
 * exclusão, que roda antes de o pedido sumir do banco.
 */
export async function sincronizarPrateleira(
  tx: TransactionClient,
  orderId: string,
  motivo: MotivoPrateleira,
  opcoes: { remover?: boolean } = {},
): Promise<AjustePrateleira[]> {
  // Trava a linha do pedido até o fim da transação: dois cliques ao mesmo
  // tempo liam o mesmo saldo e lançavam a entrada duas vezes.
  await tx.$queryRaw`SELECT "id" FROM "pedidos" WHERE "id" = ${orderId} FOR UPDATE`;

  const pedido = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      number: true,
      status: true,
      companyId: true,
      currentStage: { select: { position: true } },
      items: { select: { productId: true, quantity: true } },
      stockMovements: {
        where: { productId: { not: null } },
        select: { productId: true, type: true, quantity: true, note: true },
      },
    },
  });
  if (!pedido) return [];

  // Onde fica o "Pronto" desta empresa: etapa criada depois dele (Embalagem,
  // Conferência) ainda é peça feita, esperando o cliente.
  const etapas = await tx.productionStage.findMany({
    where: { companyId: pedido.companyId, active: true },
    select: { name: true, position: true },
  });
  const posicoesDoPronto = etapas.filter((e) => stageNameToOrderStatus(e.name) === "READY").map((e) => e.position);
  const posicao = {
    atual: pedido.currentStage?.position ?? null,
    pronto: posicoesDoPronto.length > 0 ? Math.min(...posicoesDoPronto) : null,
  };

  const ids = [...new Set(pedido.items.map((i) => i.productId).filter((id): id is string => Boolean(id)))];
  const proprias = ids.length
    ? await tx.product.findMany({
        where: { id: { in: ids }, companyId: pedido.companyId, kind: "PRODUCT" },
        select: { id: true },
      })
    : [];
  const pecaPropria = new Set(proprias.map((p) => p.id));

  const deveria =
    opcoes.remover || !ficaNaPrateleira(pedido.status, posicao)
      ? new Map<string, number>()
      : pecasDoPedido(pedido.items, (id) => pecaPropria.has(id));
  const tem = saldoDoPedidoNaPrateleira(
    pedido.stockMovements.map((m) => ({ productId: m.productId, type: m.type, quantity: Number(m.quantity), note: m.note })),
  );

  const ajustes = planejarPrateleira(deveria, tem);

  for (const ajuste of ajustes) {
    if (ajuste.type === "IN") {
      await tx.product.updateMany({
        where: { id: ajuste.productId, companyId: pedido.companyId },
        data: { currentQuantity: { increment: ajuste.quantity } },
      });
    } else {
      // GREATEST(0, ...): se alguém contou a prateleira e lançou um acerto
      // menor no meio do caminho, a saída não deixa o estoque negativo.
      await tx.$executeRaw`
        UPDATE "produtos"
        SET "currentQuantity" = GREATEST(0, "currentQuantity" - ${ajuste.quantity})
        WHERE "id" = ${ajuste.productId} AND "companyId" = ${pedido.companyId}`;
    }
    await tx.stockMovement.create({
      data: {
        productId: ajuste.productId,
        orderId,
        type: ajuste.type,
        quantity: ajuste.quantity,
        note: notaDoAjuste(ajuste, pedido.number, pedido.status, motivo),
      },
    });
  }

  return ajustes;
}
