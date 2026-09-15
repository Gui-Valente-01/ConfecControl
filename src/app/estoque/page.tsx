import { AppShell } from "@/components/app-shell";
import { DbStockManager } from "@/components/db-stock-manager";
import { requireRouteUser } from "@/lib/auth";
import { canManageStock } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Estoque de LOJA: o que já está feito.
//
// Criar o pedido não mexe aqui. Quando o pedido chega em "Pronto", as peças
// dele entram na prateleira; quando vai para "Entregue", saem. Entrada, saída
// e acerto à mão continuam valendo para o que foi feito ou comprado fora de
// pedido. Regra em src/lib/prateleira.ts.
//
// Os materiais continuam no banco; só não aparecem mais aqui.

export default async function EstoquePage() {
  const user = await requireRouteUser("/estoque");

  const [pecas, movimentos, prontos] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        size: true,
        color: true,
        currentQuantity: true,
        minimumQuantity: true,
        costInCents: true,
      },
    }),
    // Só movimento de peça: o histórico de material continua gravado, mas
    // misturar os dois numa lista só confunde quem está lendo.
    prisma.stockMovement.findMany({
      where: { product: { companyId: user.companyId } },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        product: { select: { name: true } },
        order: { select: { number: true } },
      },
    }),
    // A prateleira por pedido: tudo que ficou pronto e o cliente ainda não levou.
    prisma.order.findMany({
      where: { companyId: user.companyId, status: "READY" },
      orderBy: [{ deliveryDate: "asc" }, { number: "asc" }],
      select: {
        id: true,
        number: true,
        deliveryDate: true,
        client: { select: { name: true } },
        items: { select: { id: true, description: true, size: true, color: true, quantity: true } },
      },
    }),
  ]);

  const movimentosMapeados = movimentos.map((m) => ({
    id: m.id,
    type: m.type,
    quantity: Number(m.quantity),
    note: m.note,
    createdAt: m.createdAt,
    produtoNome: m.product?.name ?? "(peça removida)",
    orderNumber: m.order?.number ?? null,
  }));

  const canManage = canManageStock(user.role);

  return (
    <AppShell eyebrow="Peças prontas" title="Estoque" user={user}>
      <DbStockManager pecas={pecas} movimentos={movimentosMapeados} prontos={prontos} canManage={canManage} />
    </AppShell>
  );
}
