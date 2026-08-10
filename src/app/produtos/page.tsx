import { AppShell } from "@/components/app-shell";
import { DbProductsManager } from "@/components/db-products-manager";
import { requireRouteUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const user = await requireRouteUser("/produtos");
  const [products, services] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        // Peça já usada em pedido não pode ser excluída: o botão explica o
        // motivo. Os movimentos entram na conta do que some junto.
        _count: { select: { items: true, movements: true } },
      },
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
    currentQuantity: product.currentQuantity,
    minimumQuantity: product.minimumQuantity,
    _count: product._count,
  }));

  return (
    <AppShell eyebrow="Catálogo" title="Peças" actionLabel="Nova peça" user={user}>
      <DbProductsManager
        products={mappedProducts}
        services={services}
        canEdit={user.role === "ADMIN"}
      />
    </AppShell>
  );
}
