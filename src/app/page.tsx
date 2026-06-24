import { AppShell } from "@/components/app-shell";
import { DbDashboard } from "@/components/db-dashboard";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const [orders, stages, materials] = await Promise.all([
    prisma.order.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        items: { select: { description: true, quantity: true } },
      },
    }),
    prisma.productionStage.findMany({
      where: { companyId: user.companyId, active: true },
      orderBy: { position: "asc" },
      include: {
        currentOrders: {
          orderBy: { deliveryDate: "asc" },
          include: {
            client: { select: { name: true } },
            items: { select: { description: true, quantity: true } },
          },
        },
      },
    }),
    prisma.material.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const mappedMaterials = materials.map((material) => ({
    ...material,
    currentQuantity: Number(material.currentQuantity),
    minimumQuantity: Number(material.minimumQuantity),
  }));

  return (
    <AppShell eyebrow="Hoje" title="Painel da produção" user={user}>
      <DbDashboard orders={orders} stages={stages} materials={mappedMaterials} />
    </AppShell>
  );
}
