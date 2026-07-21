import { AppShell } from "@/components/app-shell";
import { notFound } from "next/navigation";
import { DbSettingsPanel } from "@/components/db-settings-panel";
import { MesasManager } from "@/components/mesas-manager";
import { StagesManager } from "@/components/stages-manager";
import { requireRouteUser } from "@/lib/auth";
import { planHasFeature } from "@/lib/features";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const user = await requireRouteUser("/configuracoes");
  const hasBancada = planHasFeature(user.features, "bancada");
  const [company, stages, mesas] = await Promise.all([
    prisma.company.findUnique({ where: { id: user.companyId } }),
    prisma.productionStage.findMany({
      where: { companyId: user.companyId },
      orderBy: { position: "asc" },
      include: { _count: { select: { currentOrders: true, toHistory: true } } },
    }),
    hasBancada
      ? prisma.mesa.findMany({
          where: { companyId: user.companyId },
          orderBy: { position: "asc" },
          include: { _count: { select: { tasks: true } } },
        })
      : Promise.resolve([]),
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

  const mappedMesas = mesas.map((mesa) => ({
    id: mesa.id,
    name: mesa.name,
    position: mesa.position,
    active: mesa.active,
    inUse: mesa._count.tasks > 0,
  }));

  return (
    <AppShell eyebrow="Administração" title="Configurações" actionLabel="Salvar" user={user}>
      <DbSettingsPanel company={company} />
      <StagesManager stages={mappedStages} />
      {hasBancada ? <MesasManager mesas={mappedMesas} /> : null}
    </AppShell>
  );
}
