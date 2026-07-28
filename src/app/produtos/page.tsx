import { AppShell } from "@/components/app-shell";
import { DbProductsManager } from "@/components/db-products-manager";
import { requireRouteUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const user = await requireRouteUser("/produtos");
  const [products, materials, services] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        bom: {
          orderBy: { createdAt: "asc" },
          include: { material: { select: { name: true, unit: true, costPerUnitInCents: true } } },
        },
        services: {
          orderBy: { createdAt: "asc" },
          include: { service: { select: { name: true } } },
        },
      },
    }),
    prisma.material.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    prisma.service.findMany({
      where: { companyId: user.companyId, active: true },
      orderBy: { position: "asc" },
      select: { id: true, name: true, defaultPriceInCents: true },
    }),
  ]);

  const mappedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    fabric: product.fabric,
    standardPriceInCents: product.standardPriceInCents,
    costInCents: product.costInCents,
    averageProductionDays: product.averageProductionDays,
    kind: product.kind,
    bom: product.bom.map((entry) => ({
      id: entry.id,
      materialId: entry.materialId,
      quantityPerUnit: Number(entry.quantityPerUnit),
      material: entry.material,
    })),
    services: product.services.map((entry) => ({
      id: entry.id,
      priceInCents: entry.priceInCents,
      service: entry.service,
    })),
  }));

  return (
    <AppShell eyebrow="Catalogo" title="Produtos e peças" actionLabel="Nova peça" user={user}>
      <DbProductsManager
        products={mappedProducts}
        materials={materials}
        services={services}
        canEdit={user.role === "ADMIN"}
      />
    </AppShell>
  );
}
