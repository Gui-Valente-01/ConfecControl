import { AppShell } from "@/components/app-shell";
import { DbDashboard } from "@/components/db-dashboard";
import { LandingPage } from "@/components/landing/landing-page";
import { getSessionUser } from "@/lib/auth";
import { planHasFeature } from "@/lib/features";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Visitante sem sessão vê a página de apresentação; usuário logado vê o painel.
  const user = await getSessionUser();
  if (!user) return <LandingPage />;
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

  const plan = {
    producao: planHasFeature(user.features, "producao"),
    estoque: planHasFeature(user.features, "estoque"),
    financeiro: planHasFeature(user.features, "financeiro"),
  };

  return (
    <AppShell eyebrow="Hoje" title="Painel da produção" user={user}>
      <DbDashboard orders={orders} stages={stages} materials={mappedMaterials} plan={plan} />
    </AppShell>
  );
}
