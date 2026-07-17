import { AppShell } from "@/components/app-shell";
import { DbClientsManager } from "@/components/db-clients-manager";
import { requireRouteUser } from "@/lib/auth";
import { planHasFeature } from "@/lib/features";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const user = await requireRouteUser("/clientes");
  const clients = await prisma.client.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true } },
      orders: { select: { totalAmountInCents: true } },
    },
  });

  return (
    <AppShell eyebrow="Relacionamento" title="Clientes" actionLabel="Novo cliente" user={user}>
      <DbClientsManager clients={clients} canEdit={user.role === "ADMIN"} hasPortal={planHasFeature(user.features, "portal")} />
    </AppShell>
  );
}
