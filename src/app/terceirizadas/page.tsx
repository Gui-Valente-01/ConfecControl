import { AppShell } from "@/components/app-shell";
import { DbPartnersManager } from "@/components/db-partners-manager";
import { requireRouteUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TerceirizadasPage() {
  const user = await requireRouteUser("/terceirizadas");
  const partners = await prisma.partner.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { orders: true } } },
  });

  const mapped = partners.map((partner) => ({
    id: partner.id,
    name: partner.name,
    service: partner.service,
    contact: partner.contact,
    phone: partner.phone,
    email: partner.email,
    notes: partner.notes,
    active: partner.active,
    orderCount: partner._count.orders,
  }));

  return (
    <AppShell eyebrow="Terceirização" title="Terceirizadas" actionLabel="Nova terceirizada" user={user}>
      <DbPartnersManager partners={mapped} canEdit={user.role === "ADMIN"} />
    </AppShell>
  );
}
