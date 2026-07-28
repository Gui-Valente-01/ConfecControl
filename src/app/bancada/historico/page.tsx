import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, LayoutGrid, PackageCheck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { requireRouteUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { canSeeBancadaHistory } from "@/lib/roles";
import { bancadaNoteBadge, bancadaNoteLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ dias?: string }>;

const periods = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "tudo", label: "Tudo" },
];

// Lista longa demais não ajuda ninguém: o resumo vem dos totais, não da tabela.
const DETAIL_LIMIT = 60;

export default async function BancadaHistoricoPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRouteUser("/bancada");
  // Desempenho da equipe é informação de gestão; o chão de fábrica não vê.
  if (!canSeeBancadaHistory(user.role)) redirect("/bancada");

  const companyId = user.companyId;
  const params = await searchParams;
  const period = periods.some((p) => p.key === params.dias) ? (params.dias as string) : "30";
  const now = new Date();
  const since = period === "tudo" ? null : new Date(now.getTime() - Number(period) * 86400000);

  const where = {
    companyId,
    status: "DONE",
    ...(since ? { doneAt: { gte: since } } : {}),
  };

  const [byPerson, byMesa, mesas, withNote, recent] = await Promise.all([
    prisma.bancadaTask.groupBy({ by: ["pickedByName"], where, _count: { _all: true } }),
    prisma.bancadaTask.groupBy({ by: ["mesaId"], where, _count: { _all: true } }),
    prisma.mesa.findMany({
      where: { companyId },
      select: { id: true, name: true, responsible: { select: { name: true } } },
    }),
    prisma.bancadaTask.count({ where: { ...where, noteKind: { not: "NONE" } } }),
    prisma.bancadaTask.findMany({
      where,
      orderBy: { doneAt: "desc" },
      take: DETAIL_LIMIT,
      include: {
        mesa: { select: { name: true } },
        order: { select: { number: true, client: { select: { name: true } }, items: { select: { description: true }, take: 1 } } },
      },
    }),
  ]);

  const mesaNameById = new Map(mesas.map((mesa) => [mesa.id, mesa.name]));
  const mesaResponsibleByName = new Map(
    mesas.filter((mesa) => mesa.responsible).map((mesa) => [mesa.name, mesa.responsible!.name]),
  );

  const people = byPerson
    .map((row) => ({ name: row.pickedByName, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
  const mesaRows = byMesa
    .map((row) => ({ name: row.mesaId ? mesaNameById.get(row.mesaId) ?? "Mesa removida" : "Sem mesa", count: row._count._all }))
    .sort((a, b) => b.count - a.count);

  const total = people.reduce((sum, row) => sum + row.count, 0);
  const topPerson = people[0];
  const periodNote = period === "tudo" ? "desde o início" : `nos últimos ${period} dias`;

  const ranking = (rows: { name: string; count: number }[], empty: string) => {
    if (rows.length === 0) {
      return <p className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-6 text-center text-sm text-[#66756d]">{empty}</p>;
    }
    const max = rows[0].count || 1;
    return (
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.name}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-[#405047]">{row.name}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-[#1c2420]">
                {row.count} <span className="font-normal text-[#8a9890]">{row.count === 1 ? "trabalho" : "trabalhos"}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eef2ef]">
              <div className="h-full rounded-full bg-[#087f7d]" style={{ width: `${Math.round((row.count / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <AppShell eyebrow="Chão de fábrica" title="Histórico da bancada" user={user} search={false}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/bancada"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#d9e1dd] bg-white px-3 text-sm font-semibold text-[#405047] shadow-sm transition hover:border-[#c7d3ce] hover:bg-[#f8faf9]"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Voltar para a bancada
        </Link>
        <div className="flex gap-1.5" role="group" aria-label="Período">
          {periods.map((option) => {
            const active = option.key === period;
            return (
              <Link
                key={option.key}
                href={`/bancada/historico?dias=${option.key}`}
                aria-current={active ? "true" : undefined}
                className={`inline-flex h-10 items-center rounded-lg border px-3 text-sm font-semibold transition ${
                  active
                    ? "border-[#087f7d] bg-[#087f7d] text-white"
                    : "border-[#d9e1dd] bg-white text-[#405047] hover:border-[#c7d3ce] hover:bg-[#f8faf9]"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Trabalhos concluídos" value={String(total)} note={periodNote} icon={PackageCheck} />
        <MetricCard label="Pessoas na produção" value={String(people.length)} note="registraram trabalho" icon={Users} tone="info" />
        <MetricCard label="Mesas usadas" value={String(mesaRows.length)} note="com trabalho concluído" icon={LayoutGrid} tone="neutral" />
        <MetricCard
          label="Com observação"
          value={String(withNote)}
          note="faltou, sobrou ou algum aviso"
          icon={AlertTriangle}
          tone={withNote > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          eyebrow="Equipe"
          title="Produção por funcionário"
          action={topPerson ? <span className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">Topo: {topPerson.name}</span> : null}
        >
          {ranking(people, "Ninguém concluiu trabalho neste período.")}
        </SectionCard>

        <SectionCard eyebrow="Estações" title="Produção por mesa">
          {mesaRows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-6 text-center text-sm text-[#66756d]">
              Nenhuma mesa com trabalho concluído neste período.
            </p>
          ) : (
            <ul className="space-y-3">
              {mesaRows.map((row) => {
                const max = mesaRows[0].count || 1;
                const responsible = mesaResponsibleByName.get(row.name);
                return (
                  <li key={row.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[#405047]">{row.name}</span>
                        <span className="block truncate text-xs text-[#8a9890]">
                          {responsible ? `Responsável: ${responsible}` : "Sem responsável definido"}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-[#1c2420]">
                        {row.count} <span className="font-normal text-[#8a9890]">{row.count === 1 ? "trabalho" : "trabalhos"}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eef2ef]">
                      <div className="h-full rounded-full bg-[#087f7d]" style={{ width: `${Math.round((row.count / max) * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Detalhe"
        title="Histórico de trabalhos"
        action={<span className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{recent.length} registro(s)</span>}
      >
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-6 text-center text-sm text-[#66756d]">
            Nenhum trabalho concluído neste período.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e4eae6] text-left text-xs uppercase tracking-[0.08em] text-[#63736b]">
                    <th className="py-2 pr-3 font-semibold">Concluído em</th>
                    <th className="py-2 pr-3 font-semibold">Pedido</th>
                    <th className="py-2 pr-3 font-semibold">Cliente</th>
                    <th className="py-2 pr-3 font-semibold">Etapa</th>
                    <th className="py-2 pr-3 font-semibold">Mesa</th>
                    <th className="py-2 pr-3 font-semibold">Funcionário</th>
                    <th className="py-2 font-semibold">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((task) => (
                    <tr key={task.id} className="border-b border-[#eef2ef] last:border-0">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-[#66756d] tabular-nums">
                        {task.doneAt ? formatDateTime(task.doneAt) : "-"}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-[#405047]">#{task.order.number}</td>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium">{task.order.client.name}</span>
                        <span className="block text-xs text-[#8a9890]">{task.order.items[0]?.description ?? "Pedido"}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-[#66756d]">{task.stageName ?? "-"}</td>
                      <td className="py-2.5 pr-3 text-[#66756d]">{task.mesa?.name ?? "Sem mesa"}</td>
                      <td className="py-2.5 pr-3 font-medium">{task.pickedByName}</td>
                      <td className="py-2.5">
                        {bancadaNoteBadge[task.noteKind] ? (
                          <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${bancadaNoteBadge[task.noteKind]}`}>
                            {bancadaNoteLabels[task.noteKind]}
                          </span>
                        ) : (
                          <span className="text-xs text-[#9aa8a0]">-</span>
                        )}
                        {task.note ? <span className="mt-0.5 block text-xs text-[#66756d]">{task.note}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > recent.length ? (
              <p className="mt-3 text-xs text-[#8a9890]">
                Mostrando os {recent.length} mais recentes de {total} no período.
              </p>
            ) : null}
          </>
        )}
      </SectionCard>
    </AppShell>
  );
}
