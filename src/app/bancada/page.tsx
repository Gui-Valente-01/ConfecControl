import { CheckCircle2, Hand, LayoutGrid, PackageCheck, Shirt, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { ToastForm } from "@/components/toast-form";
import { completeTaskAction, pickOrderAction, releaseTaskAction } from "@/app/bancada/actions";
import { requireRouteUser } from "@/lib/auth";
import { formatDateTime, formatShortDate } from "@/lib/format";
import { orderStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function firstImage(attachments: { url: string; type: string | null }[]) {
  const image = attachments.find((a) => (a.type ?? "").startsWith("image/")) ?? attachments[0];
  return image?.url ?? null;
}

export default async function BancadaPage() {
  const user = await requireRouteUser("/bancada");
  const companyId = user.companyId;

  const [mesas, activeTasks, doneByMesa, openOrders] = await Promise.all([
    prisma.mesa.findMany({ where: { companyId, active: true }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
    prisma.bancadaTask.findMany({
      where: { companyId, status: "PICKED" },
      orderBy: { pickedAt: "asc" },
      include: {
        mesa: { select: { name: true } },
        order: { select: { number: true, client: { select: { name: true } }, items: { select: { description: true, quantity: true }, take: 1 } } },
      },
    }),
    prisma.bancadaTask.groupBy({ by: ["mesaId"], where: { companyId, status: "DONE" }, _count: { _all: true } }),
    prisma.order.findMany({
      where: { companyId, status: { notIn: ["DELIVERED", "CANCELED"] } },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        items: { select: { description: true, quantity: true } },
        attachments: { select: { url: true, type: true } },
      },
    }),
  ]);

  const activeOrderIds = new Set(activeTasks.map((task) => task.orderId));
  const available = openOrders.filter((order) => !activeOrderIds.has(order.id));

  const mesaNameById = new Map(mesas.map((mesa) => [mesa.id, mesa.name]));
  const doneCounts = doneByMesa
    .map((row) => ({ name: row.mesaId ? mesaNameById.get(row.mesaId) ?? "Mesa removida" : "Sem mesa", count: row._count._all }))
    .sort((a, b) => b.count - a.count);
  const totalDone = doneCounts.reduce((sum, row) => sum + row.count, 0);

  const noteOptions = [
    ["NONE", "Sem observação"],
    ["SHORTAGE", "Faltando peça"],
    ["SURPLUS", "Sobrando peça"],
    ["INFO", "Observação"],
  ];

  return (
    <AppShell eyebrow="Chão de fábrica" title="Bancada" user={user} search={false}>
      {mesas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#c7d3ce] bg-[#fff8ec] p-6 text-center">
          <p className="text-sm font-medium text-[#7b5a0b]">Cadastre suas mesas em Configurações para começar a usar a bancada.</p>
        </div>
      ) : null}

      {/* Na bancada agora */}
      <SectionCard
        eyebrow="Em andamento"
        title="Na bancada agora"
        action={<span className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{activeTasks.length} em andamento</span>}
      >
        {activeTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-6 text-center text-sm text-[#66756d]">
            Nenhum pedido sendo trabalhado. Pegue um pedido na lista abaixo.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeTasks.map((task) => (
              <article key={task.id} className="rounded-xl border border-[#d9e1dd] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#e8f6f3] px-2 py-1 text-xs font-semibold text-[#05605e]">
                    <LayoutGrid size={12} aria-hidden="true" />
                    {task.mesa?.name ?? "Sem mesa"}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#63736b]">#{task.order.number}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{task.order.client.name}</p>
                <p className="text-sm text-[#66756d]">{task.order.items[0]?.description ?? "Pedido"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[#8a9890]">
                  <UserRound size={12} aria-hidden="true" />
                  {task.pickedByName} · pegou {formatDateTime(task.pickedAt)}
                </p>

                <ToastForm action={completeTaskAction} className="mt-3 space-y-2 border-t border-[#eef2ef] pt-3">
                  <input type="hidden" name="id" value={task.id} />
                  <div className="flex flex-wrap gap-2">
                    <select name="noteKind" defaultValue="NONE" className="h-9 rounded-lg border border-[#c7d3ce] bg-white px-2 text-xs outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4">
                      {noteOptions.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input
                      name="note"
                      placeholder="Descrição (o que faltou/sobrou)"
                      className="h-9 min-w-40 flex-1 rounded-lg border border-[#c7d3ce] px-2 text-xs outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#087f7d] text-xs font-semibold text-white transition hover:bg-[#05605e]">
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Concluído
                    </button>
                  </div>
                </ToastForm>
                <ToastForm action={releaseTaskAction} className="mt-2" confirm="Liberar este pedido (desfaz o 'peguei')?">
                  <input type="hidden" name="id" value={task.id} />
                  <button className="text-xs font-semibold text-[#9f2f42] hover:underline">Liberar pedido</button>
                </ToastForm>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Contagem por mesa */}
      {totalDone > 0 ? (
        <SectionCard eyebrow="Controle" title="Concluídos por mesa" action={<span className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{totalDone} no total</span>}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {doneCounts.map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
                <span className="flex items-center gap-2 text-sm font-medium text-[#405047]">
                  <PackageCheck size={16} className="text-[#05605e]" aria-hidden="true" />
                  {row.name}
                </span>
                <span className="text-2xl font-semibold">{row.count}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {/* Escolher pedido (bem separado, com foto) */}
      <SectionCard eyebrow="Pegar trabalho" title="Escolher pedido">
        {available.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-6 text-center text-sm text-[#66756d]">
            Nenhum pedido disponível para pegar agora.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {available.map((order) => {
              const photo = firstImage(order.attachments);
              const firstItem = order.items[0];
              const extra = order.items.length - 1;
              return (
                <article key={order.id} className="overflow-hidden rounded-xl border border-[#d9e1dd] bg-white shadow-sm">
                  <div className="flex h-44 items-center justify-center bg-[#f0f3f1]">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt={`Pedido ${order.number}`} className="h-full w-full object-cover" />
                    ) : (
                      <Shirt size={40} className="text-[#b6c2bb]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-[#405047]">#{order.number}</span>
                      <span className="rounded-md bg-[#eef4f1] px-2 py-0.5 text-xs font-semibold text-[#405047]">{orderStatusLabels[order.status]}</span>
                    </div>
                    <p className="mt-1.5 font-semibold">{order.client.name}</p>
                    <p className="text-sm text-[#66756d]">
                      {firstItem ? `${firstItem.description} (${firstItem.quantity} un.)` : "Sem item"}
                      {extra > 0 ? <span className="text-[#9aa8a0]"> +{extra}</span> : null}
                    </p>
                    <p className="mt-1 text-xs text-[#8a9890]">Entrega: {formatShortDate(order.deliveryDate)}</p>

                    <ToastForm action={pickOrderAction} className="mt-3 flex flex-wrap gap-2 border-t border-[#eef2ef] pt-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <select
                        name="mesaId"
                        required
                        defaultValue=""
                        disabled={mesas.length === 0}
                        className="h-10 min-w-28 flex-1 rounded-lg border border-[#c7d3ce] bg-white px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                      >
                        <option value="" disabled>Mesa...</option>
                        {mesas.map((mesa) => (
                          <option key={mesa.id} value={mesa.id}>{mesa.name}</option>
                        ))}
                      </select>
                      <button
                        disabled={mesas.length === 0}
                        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#111a16] px-4 text-sm font-semibold text-white transition hover:bg-[#05100b] disabled:opacity-50"
                      >
                        <Hand size={15} aria-hidden="true" />
                        Pegar
                      </button>
                    </ToastForm>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
