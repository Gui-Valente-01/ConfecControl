import { AppShell } from "@/components/app-shell";
import { DbOrdersManager } from "@/components/db-orders-manager";
import { requireRouteUser } from "@/lib/auth";
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
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        items: { select: { description: true, quantity: true } },
      },
    }),
  ]);

  return (
    <AppShell eyebrow="Operação" title="Pedidos" actionLabel="Novo pedido" user={user}>
      <DbOrdersManager clients={clients} products={products} orders={orders} />
    </AppShell>
  );
}
