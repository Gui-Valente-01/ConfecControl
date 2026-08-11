import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Inbox, Package, XCircle } from "lucide-react";
import { PortalHeader } from "@/components/portal/portal-header";
import { requirePortalClient } from "@/lib/client-auth";
import { formatLongDate, formatShortDate } from "@/lib/format";
import { isOrderLate, orderStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const requestStatus: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  PENDING: { label: "Em avaliação", className: "bg-warning-soft text-warning-ink", icon: Clock },
  ACCEPTED: { label: "Aceita", className: "bg-primary-soft text-primary-dark", icon: CheckCircle2 },
  REJECTED: { label: "Recusada", className: "bg-danger-soft text-danger-dark", icon: XCircle },
};

export default async function PortalHome() {
  const client = await requirePortalClient();

  const [orders, requests] = await Promise.all([
    prisma.order.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      include: {
        currentStage: { select: { name: true } },
        items: { select: { description: true, quantity: true } },
      },
    }),
    prisma.orderRequest.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const inProgress = orders.filter((order) => !["DELIVERED", "CANCELED"].includes(order.status));
  const done = orders.filter((order) => ["DELIVERED", "CANCELED"].includes(order.status));

  return (
    <div className="min-h-[100dvh] bg-shell text-fg">
      <PortalHeader companyName={client.companyName} clientName={client.name} />

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
        <section>
          <h1 className="text-xl font-semibold">Seus pedidos em andamento</h1>
          {inProgress.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
              <Package className="mx-auto text-faint" size={28} aria-hidden="true" />
              <p className="mt-2 text-sm text-muted">Nenhum pedido em andamento agora.</p>
              <Link href="/portal/solicitar" className="mt-3 inline-flex text-sm font-semibold text-primary hover:text-primary-dark">
                Fazer uma solicitação
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {inProgress.map((order) => {
                const late = isOrderLate(order.deliveryDate, order.status);
                const stage = order.currentStage?.name ?? orderStatusLabels[order.status];
                const firstItem = order.items[0];
                return (
                  <li key={order.id}>
                    <Link
                      href={`/portal/pedido/${order.id}`}
                      className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:border-line-strong"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-muted">#{order.number}</span>
                          <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-dark">{stage}</span>
                          {late ? <span className="rounded-md bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger-dark">Atrasado</span> : null}
                        </div>
                        <p className="mt-1.5 truncate text-sm font-medium">
                          {firstItem ? `${firstItem.description} (${firstItem.quantity} un.)` : "Pedido"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">Entrega prevista: {formatShortDate(order.deliveryDate)}</p>
                      </div>
                      <ArrowRight size={18} className="shrink-0 text-faint" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2">
            <Inbox size={18} className="text-muted" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Suas solicitações</h2>
          </div>
          {requests.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Você ainda não enviou nenhuma solicitação.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {requests.map((request) => {
                const status = requestStatus[request.status] ?? requestStatus.PENDING;
                const Icon = status.icon;
                return (
                  <li key={request.id} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {request.kind === "REORDER" ? "Repetição de peça" : "Nova peça"}
                          {request.quantity ? ` · ${request.quantity} un.` : ""}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{request.description}</p>
                        <p className="mt-1 text-xs text-faint">Enviada em {formatLongDate(request.createdAt)}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${status.className}`}>
                        <Icon size={13} aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>
                    {request.reviewNote ? (
                      <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-xs text-body">
                        Resposta da confecção: {request.reviewNote}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {done.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold">Pedidos concluídos</h2>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
              {done.slice(0, 8).map((order) => (
                <li key={order.id}>
                  <Link href={`/portal/pedido/${order.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-canvas">
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-xs text-muted">#{order.number}</span>{" "}
                      {order.items[0]?.description ?? "Pedido"}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-muted">{orderStatusLabels[order.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
