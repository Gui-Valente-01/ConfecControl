import { AppShell } from "@/components/app-shell";
import { notFound } from "next/navigation";
import { DbSettingsPanel } from "@/components/db-settings-panel";
import { StagesManager } from "@/components/stages-manager";
import { requireRouteUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const user = await requireRouteUser("/configuracoes");
  const [company, stages] = await Promise.all([
    prisma.company.findUnique({ where: { id: user.companyId } }),
    prisma.productionStage.findMany({
      where: { companyId: user.companyId },
      orderBy: { position: "asc" },
      include: { _count: { select: { currentOrders: true, toHistory: true } } },
    }),
  ]);

  if (!company) notFound();

  const mappedStages = stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    position: stage.position,
    active: stage.active,
    inUse: stage._count.currentOrders > 0 || stage._count.toHistory > 0,
  }));

  return (
    <AppShell eyebrow="Administração" title="Configurações" actionLabel="Salvar" user={user}>
      <DbSettingsPanel company={company} />
      <StagesManager stages={mappedStages} />
    </AppShell>
  );
}
