import { AppShell } from "@/components/app-shell";
import { DbStockManager } from "@/components/db-stock-manager";
import { requireRouteUser } from "@/lib/auth";
import { canManageStock } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Estoque é da PEÇA PRONTA, não do material.
//
// A confecção compra a peça e presta o serviço em cima dela. Controlar
// matéria-prima exigia manter preço e consumo de cada material em dia — o que
// ninguém mantinha, e o custo saía por baixo no relatório.
//
// Os materiais continuam no banco; só não aparecem mais aqui.

export default async function EstoquePage() {
  const user = await requireRouteUser("/estoque");

  const [pecas, movimentos] = await Promise.all([
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
      <DbStockManager pecas={pecas} movimentos={movimentosMapeados} canManage={canManage} />
    </AppShell>
  );
}
