import { AppShell } from "@/components/app-shell";
import { DbProductionBoard } from "@/components/db-production-board";
import { requireRouteUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderPriority, OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ stage?: string; status?: string; priority?: string }>;

export default async function ProducaoPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRouteUser("/producao");
  const params = await searchParams;

  const stageFilter = params.stage ?? "";
  const statusFilter = (params.status ?? "") as OrderStatus | "";
  const priorityFilter = (params.priority ?? "") as OrderPriority | "";

  const [stages, partners, employees] = await Promise.all([
    prisma.productionStage.findMany({
      where: { companyId: user.companyId, active: true },
      orderBy: { position: "asc" },
      include: {
        currentOrders: {
          orderBy: [{ priority: "desc" }, { deliveryDate: "asc" }],
          include: {
            client: { select: { name: true } },
            items: { select: { description: true, quantity: true } },
            partner: { select: { name: true } },
          },
        },
      },
    }),
    prisma.partner.findMany({
      where: { companyId: user.companyId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { companyId: user.companyId, active: true },
      orderBy: { name: "asc" },
      select: { name: true, sector: true },
    }),
  ]);

  // Aplica filtros de status/prioridade aos pedidos e de etapa as colunas.
  const filteredStages = stages
    .filter((stage) => !stageFilter || stage.id === stageFilter)
    .map((stage) => ({
      ...stage,
      currentOrders: stage.currentOrders.filter(
        (order) =>
          (!statusFilter || order.status === statusFilter) &&
          (!priorityFilter || order.priority === priorityFilter),
      ),
    }));

  return (
    <AppShell eyebrow="Chão de fábrica" title="Produção" actionLabel="Novo pedido" user={user}>
      <DbProductionBoard
        stages={filteredStages}
        stageOptions={stages.map((stage) => ({ id: stage.id, name: stage.name }))}
        partners={partners}
        employees={employees.map((e) => ({ name: e.name, sector: e.sector }))}
        filters={{ stage: stageFilter, status: statusFilter, priority: priorityFilter }}
      />
    </AppShell>
  );
}
