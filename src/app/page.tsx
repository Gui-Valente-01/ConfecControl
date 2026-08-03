import { AppShell } from "@/components/app-shell";
import { DbDashboard } from "@/components/db-dashboard";
import { LandingPage } from "@/components/landing/landing-page";
import { getSessionUser } from "@/lib/auth";
import { planHasFeature } from "@/lib/features";
import { canSeeFinance } from "@/lib/roles";
import { findIncompleteCosts } from "@/lib/production";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Visitante sem sessão vê a página de apresentação; usuário logado vê o painel.
  const user = await getSessionUser();
  if (!user) return <LandingPage />;
  const [orders, stages, materials, products] = await Promise.all([
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
    prisma.product.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        costInCents: true,
        bom: { select: { material: { select: { name: true, costPerUnitInCents: true } } } },
      },
    }),
  ]);

  // Peça com custo incompleto faz a margem do relatório mentir: ou não tem
  // ficha nem custo digitado, ou usa material que ainda está sem preço.
  const { productIds: comMaterialSemPreco } = findIncompleteCosts(
    products.map((p) => ({
      id: p.id,
      bom: p.bom.map((entry) => ({
        materialName: entry.material.name,
        materialPriceInCents: entry.material.costPerUnitInCents,
      })),
    })),
  );
  const productsWithoutCost = products.filter(
    (p) => comMaterialSemPreco.has(p.id) || (p.bom.length === 0 && p.costInCents === 0),
  ).length;
  const mappedMaterials = materials.map((material) => ({
    ...material,
    currentQuantity: Number(material.currentQuantity),
    minimumQuantity: Number(material.minimumQuantity),
  }));

  const showFinance = canSeeFinance(user.role);
  const plan = {
    producao: planHasFeature(user.features, "producao"),
    estoque: planHasFeature(user.features, "estoque"),
    financeiro: planHasFeature(user.features, "financeiro") && showFinance,
  };

  return (
    <AppShell eyebrow="Hoje" title="Painel da produção" user={user}>
      <DbDashboard
        orders={orders}
        stages={stages}
        materials={mappedMaterials}
        productsWithoutCost={productsWithoutCost}
        plan={plan}
        showFinance={showFinance}
      />
    </AppShell>
  );
}
