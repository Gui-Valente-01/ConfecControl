import { AppShell } from "@/components/app-shell";
import { DbOrdersManager } from "@/components/db-orders-manager";
import { requireRouteUser } from "@/lib/auth";
import { canManageOrders, canSeeFinance } from "@/lib/roles";
import { descreverFiltro, eFiltroPedido, filtrarPedidos } from "@/lib/order-filters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const user = await requireRouteUser("/pedidos");
  // O filtro vem da URL (?filtro=atrasados) porque é assim que os avisos do
  // Início conseguem abrir a lista já reduzida ao que a pessoa clicou.
  const params = await searchParams;
  const filtro = eFiltroPedido(params.filtro) ? params.filtro : null;
  const [clients, products, serviceSuggestions, orders] = await Promise.all([
    prisma.client.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, standardPriceInCents: true },
    }),
    prisma.service.findMany({
      where: { companyId: user.companyId, active: true },
      orderBy: { position: "asc" },
      select: { name: true, defaultPriceInCents: true },
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

  const visiveis = filtrarPedidos(orders, filtro);
  const descricao = filtro ? descreverFiltro(filtro) : null;

  return (
    <AppShell
      eyebrow="Operação"
      title={descricao ? descricao.titulo : "Pedidos"}
      actionLabel={canManage ? "Novo pedido" : undefined}
      user={user}
    >
      <DbOrdersManager
        clients={clients}
        serviceSuggestions={serviceSuggestions}
        products={products}
        orders={visiveis}
        canPrioritize={canPrioritize}
        canManage={canManage}
        showFinance={showFinance}
        filtro={filtro}
        filtroTexto={descricao}
        totalSemFiltro={orders.length}
      />
    </AppShell>
  );
}
