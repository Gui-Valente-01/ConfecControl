import { AppShell } from "@/components/app-shell";
import { DbOrdersManager } from "@/components/db-orders-manager";
import { requireRouteUser } from "@/lib/auth";
import { canManageOrders, canSeeFinance } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const user = await requireRouteUser("/pedidos");
  const [clients, products, orders] = await Promise.all([
    prisma.client.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, standardPriceInCents: true },
    }),
    prisma.order.findMany({
      where: { companyId: user.companyId },
      // Mais importantes em cima; dentro da mesma prioridade, prazo mais próximo primeiro.
      orderBy: [{ priority: "desc" }, { deliveryDate: "asc" }, { createdAt: "desc" }],
      include: {
        client: { select: { name: true } },
        items: { select: { description: true, quantity: true } },
      },
    }),
  ]);

  const canPrioritize = user.role === "ADMIN" || user.role === "MANAGER";
  const canManage = canManageOrders(user.role);
  const showFinance = canSeeFinance(user.role);

  return (
    <AppShell eyebrow="Operação" title="Pedidos" actionLabel={canManage ? "Novo pedido" : undefined} user={user}>
      <DbOrdersManager
        clients={clients}
        products={products}
        orders={orders}
        canPrioritize={canPrioritize}
        canManage={canManage}
        showFinance={showFinance}
      />
    </AppShell>
  );
}
