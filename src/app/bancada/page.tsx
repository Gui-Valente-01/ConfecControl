import Link from "next/link";
import { AlertTriangle, CheckCircle2, Hand, History, LayoutGrid, PackageCheck, Shirt, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { ToastForm } from "@/components/toast-form";
import { completeTaskAction, pickOrderAction, releaseTaskAction } from "@/app/bancada/actions";
import { requireRouteUser } from "@/lib/auth";
import { formatDateTime, formatShortDate } from "@/lib/format";
import { ModeloDoPedido } from "@/components/modelo-do-pedido";
import { primeiraImagem } from "@/lib/anexos";
import { mesasCompativeis } from "@/lib/mesa-rules";
import { canSeeBancadaHistory } from "@/lib/roles";
import {
  bancadaNoteBadge,
  bancadaNoteLabels,
  orderPriorityBadge,
  orderPriorityLabels,
  orderStatusLabels,
} from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";



export default async function BancadaPage() {
  const user = await requireRouteUser("/bancada");
  const companyId = user.companyId;

  const [mesas, activeTasks, doneByMesa, recentDone, doneStages, openOrders] = await Promise.all([
    prisma.mesa.findMany({
      where: { companyId, active: true },
      orderBy: { position: "asc" },
      select: { id: true, name: true, stageId: true, stage: { select: { name: true } } },
    }),
    prisma.bancadaTask.findMany({
      where: { companyId, status: "PICKED" },
      orderBy: { pickedAt: "asc" },
      include: {
        mesa: { select: { name: true } },
        order: {
          select: {
            number: true,
            client: { select: { name: true } },
            items: { select: { description: true, quantity: true }, take: 1 },
            attachments: { select: { id: true, name: true, url: true, type: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    }),
    prisma.bancadaTask.groupBy({ by: ["mesaId"], where: { companyId, status: "DONE" }, _count: { _all: true } }),
    prisma.bancadaTask.findMany({
      where: { companyId, status: "DONE" },
      orderBy: { doneAt: "desc" },
      take: 6,
      include: {
        mesa: { select: { name: true } },
        order: { select: { number: true, client: { select: { name: true } }, items: { select: { description: true }, take: 1 } } },
      },
    }),
    prisma.bancadaTask.findMany({ where: { companyId, status: "DONE" }, select: { orderId: true, stageName: true } }),
    prisma.order.findMany({
      // Pronto/Entregue/Cancelado não precisam mais de trabalho de bancada.
      where: { companyId, status: { notIn: ["READY", "DELIVERED", "CANCELED"] } },
      // Mais importantes em cima para o funcionário pegar primeiro.
      orderBy: [{ priority: "desc" }, { deliveryDate: "asc" }, { createdAt: "desc" }],
      include: {
        client: { select: { name: true } },
        items: { select: { description: true, quantity: true } },
        attachments: { select: { id: true, name: true, url: true, type: true }, orderBy: { createdAt: "asc" } },
        currentStage: { select: { name: true } },
      },
    }),
  ]);

  // O pedido sai da fila enquanto alguém está com ele e continua fora depois de
  // concluído na etapa em que está — senão ele voltaria para "pegar trabalho"
  // como se nada tivesse sido feito. Ao mudar de etapa, volta a ficar disponível.
  const activeOrderIds = new Set(activeTasks.map((task) => task.orderId));
  const doneKeys = new Set(doneStages.map((task) => `${task.orderId}::${task.stageName ?? ""}`));
  const available = openOrders.filter(
    (order) => !activeOrderIds.has(order.id) && !doneKeys.has(`${order.id}::${order.currentStage?.name ?? ""}`),
  );

  const mesaNameById = new Map(mesas.map((mesa) => [mesa.id, mesa.name]));
  const doneCounts = doneByMesa
    .map((row) => ({ name: row.mesaId ? mesaNameById.get(row.mesaId) ?? "Mesa removida" : "Sem mesa", count: row._count._all }))
    .sort((a, b) => b.count - a.count);
  const totalDone = doneCounts.reduce((sum, row) => sum + row.count, 0);

  // Forma que a regra de compatibilidade espera, montada uma vez só.
  const mesasComEtapa = mesas.map((mesa) => ({
    id: mesa.id,
    name: mesa.name,
    stageId: mesa.stageId,
    stageName: mesa.stage?.name ?? null,
  }));

  const noteOptions = Object.entries(bancadaNoteLabels);
  const canSeeHistory = canSeeBancadaHistory(user.role);

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

                {/* O modelo fica à mão de quem está produzindo: é o que evita
                    fazer a peça errada e descobrir só na conferência. */}
                <div className="mt-3">
                  <ModeloDoPedido anexos={task.order.attachments} numeroPedido={task.order.number} compacto />
                </div>

                {/* Esta tela é usada em pé, no celular, com a mão ocupada. Os
                    controles têm 44px de altura (mínimo confortável para o
                    dedo) e texto de 16px no celular, que é o tamanho abaixo do
                    qual o iPhone dá zoom sozinho ao tocar no campo. */}
                <ToastForm action={completeTaskAction} className="mt-3 space-y-2 border-t border-[#eef2ef] pt-3">
                  <input type="hidden" name="id" value={task.id} />
                  <div className="flex flex-wrap gap-2">
                    <select name="noteKind" defaultValue="NONE" className="h-11 rounded-lg border border-[#c7d3ce] bg-white px-2 text-base outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4 sm:h-10 sm:text-sm">
                      {noteOptions.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input
                      name="note"
                      placeholder="O que faltou ou sobrou"
                      className="h-11 min-w-40 flex-1 rounded-lg border border-[#c7d3ce] px-2 text-base outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4 sm:h-10 sm:text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#087f7d] text-base font-semibold text-white transition hover:bg-[#05605e] sm:h-10 sm:text-sm">
                      <CheckCircle2 size={18} aria-hidden="true" />
                      Concluído
                    </button>
                  </div>
                </ToastForm>
                <ToastForm action={releaseTaskAction} className="mt-1" confirm="Liberar este pedido (desfaz o 'peguei')?">
                  <input type="hidden" name="id" value={task.id} />
                  <button className="inline-flex h-11 items-center px-1 text-sm font-semibold text-[#9f2f42] hover:underline sm:h-9">
                    Liberar pedido
                  </button>
                </ToastForm>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Concluídos recentes: o trabalho feito fica visível, não some da tela */}
      {recentDone.length > 0 ? (
        <SectionCard
          eyebrow="Finalizados"
          title="Concluídos recentemente"
          action={
            canSeeHistory ? (
              <Link
                href="/bancada/historico"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#d9e1dd] bg-white px-3 text-sm font-semibold text-[#405047] shadow-sm transition hover:border-[#c7d3ce] hover:bg-[#f8faf9]"
              >
                <History size={15} aria-hidden="true" />
                Ver histórico
              </Link>
            ) : null
          }
        >
          <ul className="divide-y divide-[#eef2ef]">
            {recentDone.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 first:pt-0 last:pb-0">
                <CheckCircle2 size={16} className="shrink-0 text-[#05605e]" aria-hidden="true" />
                <span className="font-mono text-xs font-semibold text-[#63736b]">#{task.order.number}</span>
                <span className="text-sm font-semibold">{task.order.client.name}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-[#66756d]">
                  {task.order.items[0]?.description ?? "Pedido"}
                </span>
                {task.stageName ? (
                  <span className="rounded-md bg-[#eef4f1] px-2 py-0.5 text-xs font-semibold text-[#405047]">{task.stageName}</span>
                ) : null}
                {bancadaNoteBadge[task.noteKind] ? (
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${bancadaNoteBadge[task.noteKind]}`}>
                    {bancadaNoteLabels[task.noteKind]}
                  </span>
                ) : null}
                <span className="text-xs text-[#8a9890]">
                  {task.mesa?.name ?? "Sem mesa"} · {task.pickedByName}
                  {task.doneAt ? ` · ${formatDateTime(task.doneAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

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
              const foto = primeiraImagem(order.attachments);
              const firstItem = order.items[0];
              const extra = order.items.length - 1;
              const mesasParaOPedido = mesasCompativeis(mesasComEtapa, order.currentStageId);
              return (
                <article key={order.id} className="overflow-hidden rounded-xl border border-[#d9e1dd] bg-white shadow-sm">
                  <div className="flex h-44 items-center justify-center bg-[#f0f3f1]">
                    {foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={foto.url}
                        alt={`Modelo do pedido ${order.number}: ${foto.name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Shirt size={40} className="text-[#b6c2bb]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-[#405047]">#{order.number}</span>
                      <div className="flex items-center gap-1.5">
                        {order.priority === "URGENT" || order.priority === "HIGH" ? (
                          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${orderPriorityBadge[order.priority]}`}>
                            {orderPriorityLabels[order.priority]}
                          </span>
                        ) : null}
                        <span className="rounded-md bg-[#eef4f1] px-2 py-0.5 text-xs font-semibold text-[#405047]">{orderStatusLabels[order.status]}</span>
                      </div>
                    </div>
                    <p className="mt-1.5 font-semibold">{order.client.name}</p>
                    <p className="text-sm text-[#66756d]">
                      {firstItem ? `${firstItem.description} (${firstItem.quantity} un.)` : "Sem item"}
                      {extra > 0 ? <span className="text-[#9aa8a0]"> +{extra}</span> : null}
                    </p>
                    <p className="mt-1 text-xs text-[#8a9890]">Entrega: {formatShortDate(order.deliveryDate)}</p>

                    {/* Arte em PDF ou .cdr não aparece na foto acima: aqui ela
                        vira um item que dá para abrir ou baixar. */}
                    <div className="mt-2">
                      <ModeloDoPedido anexos={order.attachments} numeroPedido={order.number} compacto />
                    </div>

                    {/* Só as mesas que atendem a etapa deste pedido. Mostrar
                        as outras e recusar depois seria fazer a pessoa errar
                        primeiro para só então explicar. */}
                    {mesasParaOPedido.length === 0 ? (
                      <p className="mt-3 flex items-start gap-2 rounded-lg border border-[#ead49c] bg-[#fffcf3] px-2.5 py-2 text-xs leading-5 text-[#7b5a0b]">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                          Nenhuma mesa atende a etapa <strong>{order.currentStage?.name ?? "atual"}</strong> deste
                          pedido. Avance ele na Produção, ou ajuste as mesas em Configurações.
                        </span>
                      </p>
                    ) : (
                      <ToastForm action={pickOrderAction} className="mt-3 flex flex-wrap gap-2 border-t border-[#eef2ef] pt-3">
                        <input type="hidden" name="orderId" value={order.id} />
                        <select
                          name="mesaId"
                          required
                          defaultValue=""
                          aria-label={`Mesa para o pedido ${order.number}`}
                          className="h-12 min-w-28 flex-1 rounded-lg border border-[#c7d3ce] bg-white px-2 text-base outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4 sm:h-10 sm:text-sm"
                        >
                          <option value="" disabled>Mesa...</option>
                          {mesasParaOPedido.map((mesa) => (
                            <option key={mesa.id} value={mesa.id}>{mesa.name}</option>
                          ))}
                        </select>
                        <button
                          aria-label={`Pegar o pedido ${order.number}`}
                          className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#111a16] px-5 text-base font-semibold text-white transition hover:bg-[#05100b] sm:h-10 sm:px-4 sm:text-sm"
                        >
                          <Hand size={18} aria-hidden="true" />
                          Pegar
                        </button>
                      </ToastForm>
                    )}
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
