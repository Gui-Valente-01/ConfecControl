import { AppShell } from "@/components/app-shell";
import { DbStockManager } from "@/components/db-stock-manager";
import { requireRouteUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EstoquePage() {
  const user = await requireRouteUser("/estoque");
  const [materials, movements] = await Promise.all([
    prisma.material.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.stockMovement.findMany({
      where: { material: { companyId: user.companyId } },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        material: { select: { name: true, unit: true } },
        order: { select: { number: true } },
      },
    }),
  ]);

  const mappedMaterials = materials.map((material) => ({
    ...material,
    currentQuantity: Number(material.currentQuantity),
    minimumQuantity: Number(material.minimumQuantity),
  }));

  const mappedMovements = movements.map((movement) => ({
    id: movement.id,
    type: movement.type,
    quantity: Number(movement.quantity),
    note: movement.note,
    createdAt: movement.createdAt,
    materialName: movement.material.name,
    unit: movement.material.unit,
    orderNumber: movement.order?.number ?? null,
  }));

  return (
    <AppShell eyebrow="Almoxarifado" title="Estoque" actionLabel="Novo material" user={user}>
      <DbStockManager materials={mappedMaterials} movements={mappedMovements} canEdit={user.role === "ADMIN"} />
    </AppShell>
  );
}
