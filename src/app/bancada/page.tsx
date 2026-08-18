import { comLinkAssinado } from "@/lib/anexos-link";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, Hand, History, LayoutGrid, Shirt } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ToastForm } from "@/components/toast-form";
import { completeTaskAction, pickOrderAction, releaseTaskAction } from "@/app/bancada/actions";
import { requireRouteUser } from "@/lib/auth";
import { formatDateTime, formatShortDate } from "@/lib/format";
import { ChamadoBancada } from "@/components/chamado-bancada";
import { FotoDaBancada } from "@/components/foto-da-bancada";
import { ModeloDoPedido } from "@/components/modelo-do-pedido";
import { primeiraImagem } from "@/lib/anexos";
import { mesasCompativeis } from "@/lib/mesa-rules";
import { canSeeBancadaHistory, seesAllBancadaWork } from "@/lib/roles";
import {
  bancadaNoteBadge,
  bancadaNoteLabels,
  orderPriorityBadge,
  orderPriorityLabels,
} from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";



export default async function BancadaPage() {
  const user = await requireRouteUser("/bancada");
  const companyId = user.companyId;

  const [mesas, activeTasks, totalDone, recentDone, doneStages, openOrders] = await Promise.all([
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
            attachments: { select: { id: true, name: true, url: true, storagePath: true, type: true, origem: true, sentBy: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    }),
    prisma.bancadaTask.count({ where: { companyId, status: "DONE" } }),
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
        attachments: { select: { id: true, name: true, url: true, storagePath: true, type: true, origem: true, sentBy: true }, orderBy: { createdAt: "asc" } },
        currentStage: { select: { name: true } },
      },
    }),
  ]);

  // Bucket privado: o banco guarda o caminho, e a tela precisa de um link que
  // expira. Assinado aqui, de uma vez, para os componentes continuarem
  // recebendo apenas "url" e para nao assinar o mesmo arquivo duas vezes.
  const tarefasAtivas = await Promise.all(
    activeTasks.map(async (task) => ({
      ...task,
      order: { ...task.order, attachments: await comLinkAssinado(task.order.attachments, companyId) },
    })),
  );
  const pedidosAbertos = await Promise.all(
    openOrders.map(async (order) => ({
      ...order,
      attachments: await comLinkAssinado(order.attachments, companyId),
    })),
  );

  // O pedido sai da fila enquanto alguém está com ele e continua fora depois de
  // concluído na etapa em que está — senão ele voltaria para "pegar trabalho"
  // como se nada tivesse sido feito. Ao mudar de etapa, volta a ficar disponível.
  const activeOrderIds = new Set(activeTasks.map((task) => task.orderId));
  const doneKeys = new Set(doneStages.map((task) => `${task.orderId}::${task.stageName ?? ""}`));
  const available = pedidosAbertos.filter(
    (order) => !activeOrderIds.has(order.id) && !doneKeys.has(`${order.id}::${order.currentStage?.name ?? ""}`),
  );

  // Forma que a regra de compatibilidade espera, montada uma vez só.
  const mesasComEtapa = mesas.map((mesa) => ({
    id: mesa.id,
    name: mesa.name,
    stageId: mesa.stageId,
    stageName: mesa.stage?.name ?? null,
  }));

  const noteOptions = Object.entries(bancadaNoteLabels);
  const canSeeHistory = canSeeBancadaHistory(user.role);

  // Quem produz vê em destaque só a própria peça: com a mão ocupada, o card do
  // colega no meio do caminho é o que faz concluir o pedido errado. O trabalho
  // dos outros continua na tela, mas como lista curta de acompanhamento.
  //
  // Quem coordena continua vendo tudo em destaque: para ele a pergunta é
  // justamente o que está em cada mesa agora.
  const veTudo = seesAllBancadaWork(user.role);
  const minhasTarefas = veTudo ? tarefasAtivas : tarefasAtivas.filter((task) => task.pickedById === user.id);
  const tarefasDosColegas = veTudo ? [] : tarefasAtivas.filter((task) => task.pickedById !== user.id);

  // "Um por vez": a tela mostra só o que a pessoa está fazendo. A fila de
  // pedidos e os concluídos ficam recolhidos, para não competir com o trabalho
  // atual. Se não há nada em andamento, a fila já abre para a pessoa começar.
  const filaAberta = minhasTarefas.length === 0 && available.length > 0;

  return (
    <AppShell eyebrow="Chão de fábrica" title="Bancada" user={user} search={false}>
      {mesas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-warning-soft p-6 text-center">
          <p className="text-sm font-medium text-warning-ink">Cadastre suas mesas em Configurações para começar a usar a bancada.</p>
        </div>
      ) : null}

      {/* ===================================================================
          1) O QUE ESTOU FAZENDO — o herói da tela. Cada pedido em andamento é
          um card grande, largura cheia no celular: nome grande, o modelo à
          mão, e um único botão grande "Terminei".
      =================================================================== */}
      {minhasTarefas.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-tint text-primary">
            <Hand size={26} aria-hidden="true" />
          </div>
          <p className="mt-3 text-base font-semibold text-fg">Você não está com nenhum pedido</p>
          <p className="mt-1 text-sm text-muted">Toque em “Pegar pedido” abaixo para começar a trabalhar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {minhasTarefas.map((task) => (
            <article key={task.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm">
              {/* Cliente grande; a mesa fica como etiqueta calma à direita. */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-semibold leading-tight text-fg">{task.order.client.name}</p>
                  <p className="mt-0.5 text-[15px] text-muted">{task.order.items[0]?.description ?? "Pedido"}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary-dark">
                  <LayoutGrid size={13} aria-hidden="true" />
                  {task.mesa?.name ?? "Sem mesa"}
                </span>
              </div>
              <p className="mt-1 text-xs text-faint">
                #{task.order.number} · {task.pickedByName}, {formatDateTime(task.pickedAt)}
              </p>

              {/* O modelo à mão evita fazer a peça errada; foto e chamado logo abaixo. */}
              <div className="mt-4">
                <ModeloDoPedido anexos={task.order.attachments} numeroPedido={task.order.number} compacto />
                <FotoDaBancada taskId={task.id} numeroPedido={task.order.number} />
                <ChamadoBancada orderId={task.orderId} numeroPedido={task.order.number} />
              </div>

              {/* Ação principal no fim do card, sempre no mesmo lugar. O aviso de
                  faltou/sobrou fica recolhido: quem só quer terminar vê apenas o
                  botão grande. Alvos altos e texto 16px (o iPhone não dá zoom). */}
              <div className="mt-5 border-t border-divider pt-4">
                <ToastForm action={completeTaskAction} className="space-y-3">
                  <input type="hidden" name="id" value={task.id} />

                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted [&::-webkit-details-marker]:hidden">
                      <ChevronDown size={15} className="transition group-open:rotate-180" aria-hidden="true" />
                      Faltou ou sobrou peça? (opcional)
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <select name="noteKind" defaultValue="NONE" className="h-12 rounded-xl border border-line-strong bg-surface px-3 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:h-11 sm:text-sm">
                        {noteOptions.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <input
                        name="note"
                        placeholder="O que faltou ou sobrou"
                        className="h-12 min-w-40 flex-1 rounded-xl border border-line-strong px-3 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:h-11 sm:text-sm"
                      />
                    </div>
                  </details>

                  <button className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-2xl font-bold text-white shadow-sm transition hover:bg-primary-dark">
                    <CheckCircle2 size={30} aria-hidden="true" />
                    Terminei
                  </button>
                </ToastForm>

                <ToastForm action={releaseTaskAction} className="mt-2 text-center" confirm="Liberar este pedido (desfaz o 'peguei')?">
                  <input type="hidden" name="id" value={task.id} />
                  <button className="inline-flex h-10 items-center px-3 text-sm font-medium text-danger-dark hover:underline">
                    Não é comigo — liberar
                  </button>
                </ToastForm>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Só para quem produz: o que os colegas estão fazendo, como lista curta.
          Serve para saber que a peça já tem dono — não tem botão, porque o
          trabalho é de outra pessoa. */}
      {tarefasDosColegas.length > 0 ? (
        <div className="rounded-2xl border border-line bg-canvas px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Nas outras mesas</p>
          <ul className="mt-2 divide-y divide-divider">
            {tarefasDosColegas.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 py-2 text-sm first:pt-0 last:pb-0">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-tint px-2 py-0.5 text-xs font-semibold text-body">
                  <LayoutGrid size={11} aria-hidden="true" />
                  {task.mesa?.name ?? "Sem mesa"}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted">
                  #{task.order.number} · {task.order.client.name}
                </span>
                <span className="text-xs text-soft">{task.pickedByName}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ===================================================================
          2) PEGAR PEDIDO — a fila fica atrás de um botão. Quem está trabalhando
          não precisa vê-la; quem terminou (ou está sem pedido) abre e escolhe.
      =================================================================== */}
      {available.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong bg-canvas px-4 py-5 text-center text-sm text-muted">
          Nenhum pedido na fila para pegar agora.
        </p>
      ) : (
        <details className="group" open={filaAberta}>
          <summary className="flex h-14 cursor-pointer list-none items-center justify-between rounded-2xl bg-ink px-5 text-white transition hover:bg-[#05100b] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2.5 text-lg font-semibold">
              <Hand size={20} aria-hidden="true" />
              Pegar pedido
            </span>
            <span className="flex items-center gap-2.5">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-semibold">{available.length} na fila</span>
              <ChevronDown size={20} className="transition group-open:rotate-180" aria-hidden="true" />
            </span>
          </summary>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {available.map((order) => {
              const foto = primeiraImagem(order.attachments);
              const firstItem = order.items[0];
              const extra = order.items.length - 1;
              const mesasParaOPedido = mesasCompativeis(mesasComEtapa, order.currentStageId);
              return (
                <article key={order.id} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                  <div className="relative flex h-40 items-center justify-center bg-tint">
                    {foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={foto.url}
                        alt={`Modelo do pedido ${order.number}: ${foto.name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Shirt size={40} className="text-faint" aria-hidden="true" />
                    )}
                    {order.priority === "URGENT" || order.priority === "HIGH" ? (
                      <span className={`absolute left-2 top-2 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${orderPriorityBadge[order.priority]}`}>
                        {orderPriorityLabels[order.priority]}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 truncate font-semibold text-fg">{order.client.name}</p>
                      <span className="shrink-0 font-mono text-xs font-semibold text-soft">#{order.number}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      {firstItem ? `${firstItem.description} (${firstItem.quantity} un.)` : "Sem item"}
                      {extra > 0 ? <span className="text-faint"> +{extra}</span> : null}
                    </p>
                    <p className="mt-1 text-xs text-soft">Entrega: {formatShortDate(order.deliveryDate)}</p>

                    {/* Arte em PDF/.cdr não vira miniatura acima: aqui abre ou baixa. */}
                    <div className="mt-2">
                      <ModeloDoPedido anexos={order.attachments} numeroPedido={order.number} compacto />
                    </div>

                    {/* Só as mesas que atendem a etapa deste pedido: mostrar as
                        outras e recusar depois seria fazer a pessoa errar antes. */}
                    {mesasParaOPedido.length === 0 ? (
                      <p className="mt-3 flex items-start gap-2 rounded-xl border border-warning-line bg-warning-soft px-2.5 py-2 text-xs leading-5 text-warning-ink">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                          Nenhuma mesa atende a etapa <strong>{order.currentStage?.name ?? "atual"}</strong> deste
                          pedido. Avance ele na Produção, ou ajuste as mesas em Configurações.
                        </span>
                      </p>
                    ) : (
                      <ToastForm action={pickOrderAction} className="mt-3 flex flex-wrap gap-2 border-t border-divider pt-3">
                        <input type="hidden" name="orderId" value={order.id} />
                        <select
                          name="mesaId"
                          required
                          defaultValue=""
                          aria-label={`Mesa para o pedido ${order.number}`}
                          className="h-12 min-w-28 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:h-11 sm:text-sm"
                        >
                          <option value="" disabled>Mesa...</option>
                          {mesasParaOPedido.map((mesa) => (
                            <option key={mesa.id} value={mesa.id}>{mesa.name}</option>
                          ))}
                        </select>
                        <button
                          aria-label={`Pegar o pedido ${order.number}`}
                          className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-white transition hover:bg-primary-dark sm:h-11 sm:px-4"
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
        </details>
      )}

      {/* ===================================================================
          3) CONCLUÍDOS — recolhido no rodapé. O detalhamento por mesa e por
          pessoa vive no Histórico (só gestão); aqui basta os últimos + o total.
      =================================================================== */}
      {recentDone.length > 0 ? (
        <details className="group rounded-2xl border border-line bg-surface shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-semibold text-body">
              <CheckCircle2 size={16} className="text-primary-dark" aria-hidden="true" />
              Concluídos recentemente
            </span>
            <span className="flex items-center gap-2">
              <span className="rounded-lg bg-tint px-2.5 py-1 text-xs font-semibold text-body">{totalDone} no total</span>
              <ChevronDown size={16} className="text-soft transition group-open:rotate-180" aria-hidden="true" />
            </span>
          </summary>

          <div className="border-t border-divider px-5 py-3">
            <ul className="divide-y divide-divider">
              {recentDone.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 first:pt-0 last:pb-0">
                  <span className="font-mono text-xs font-semibold text-muted">#{task.order.number}</span>
                  <span className="text-sm font-semibold">{task.order.client.name}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">
                    {task.order.items[0]?.description ?? "Pedido"}
                  </span>
                  {bancadaNoteBadge[task.noteKind] ? (
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${bancadaNoteBadge[task.noteKind]}`}>
                      {bancadaNoteLabels[task.noteKind]}
                    </span>
                  ) : null}
                  <span className="text-xs text-soft">
                    {task.mesa?.name ?? "Sem mesa"} · {task.pickedByName}
                    {task.doneAt ? ` · ${formatDateTime(task.doneAt)}` : ""}
                  </span>
                </li>
              ))}
            </ul>

            {canSeeHistory ? (
              <Link
                href="/bancada/historico"
                className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-body shadow-sm transition hover:border-line-strong hover:bg-canvas"
              >
                <History size={15} aria-hidden="true" />
                Ver histórico completo
              </Link>
            ) : null}
          </div>
        </details>
      ) : null}
    </AppShell>
  );
}
