import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Inbox, Package, XCircle } from "lucide-react";
import { PortalHeader } from "@/components/portal/portal-header";
import { requirePortalClient } from "@/lib/client-auth";
import { formatLongDate, formatShortDate } from "@/lib/format";
import { isOrderLate, orderStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const requestStatus: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  PENDING: { label: "Em avaliação", className: "bg-[#fff7dd] text-[#7b5a0b]", icon: Clock },
  ACCEPTED: { label: "Aceita", className: "bg-[#e8f6f3] text-[#05605e]", icon: CheckCircle2 },
  REJECTED: { label: "Recusada", className: "bg-[#fff0f2] text-[#9f2f42]", icon: XCircle },
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
    <div className="min-h-[100dvh] bg-[#f4f6f5] text-[#1c2420]">
      <PortalHeader companyName={client.companyName} clientName={client.name} />

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
        <section>
          <h1 className="text-xl font-semibold">Seus pedidos em andamento</h1>
          {inProgress.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#c7d3ce] bg-white p-8 text-center">
              <Package className="mx-auto text-[#9aa8a0]" size={28} aria-hidden="true" />
              <p className="mt-2 text-sm text-[#66756d]">Nenhum pedido em andamento agora.</p>
              <Link href="/portal/solicitar" className="mt-3 inline-flex text-sm font-semibold text-[#087f7d] hover:text-[#05605e]">
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
                      className="flex items-center gap-4 rounded-xl border border-[#d9e1dd] bg-white p-4 shadow-sm transition hover:border-[#c7d3ce]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[#63736b]">#{order.number}</span>
                          <span className="rounded-md bg-[#e8f6f3] px-2 py-0.5 text-xs font-semibold text-[#05605e]">{stage}</span>
                          {late ? <span className="rounded-md bg-[#fff0f2] px-2 py-0.5 text-xs font-semibold text-[#9f2f42]">Atrasado</span> : null}
                        </div>
                        <p className="mt-1.5 truncate text-sm font-medium">
                          {firstItem ? `${firstItem.description} (${firstItem.quantity} un.)` : "Pedido"}
                        </p>
                        <p className="mt-0.5 text-xs text-[#63736b]">Entrega prevista: {formatShortDate(order.deliveryDate)}</p>
                      </div>
                      <ArrowRight size={18} className="shrink-0 text-[#9aa8a0]" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2">
            <Inbox size={18} className="text-[#63736b]" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Suas solicitações</h2>
          </div>
          {requests.length === 0 ? (
            <p className="mt-3 text-sm text-[#66756d]">Você ainda não enviou nenhuma solicitação.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {requests.map((request) => {
                const status = requestStatus[request.status] ?? requestStatus.PENDING;
                const Icon = status.icon;
                return (
                  <li key={request.id} className="rounded-xl border border-[#d9e1dd] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {request.kind === "REORDER" ? "Repetição de peça" : "Nova peça"}
                          {request.quantity ? ` · ${request.quantity} un.` : ""}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-[#66756d]">{request.description}</p>
                        <p className="mt-1 text-xs text-[#9aa8a0]">Enviada em {formatLongDate(request.createdAt)}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${status.className}`}>
                        <Icon size={13} aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>
                    {request.reviewNote ? (
                      <p className="mt-2 rounded-lg bg-[#f8faf9] px-3 py-2 text-xs text-[#52635a]">
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
            <ul className="mt-3 divide-y divide-[#e6ece9] rounded-xl border border-[#d9e1dd] bg-white">
              {done.slice(0, 8).map((order) => (
                <li key={order.id}>
                  <Link href={`/portal/pedido/${order.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-[#f8faf9]">
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-xs text-[#63736b]">#{order.number}</span>{" "}
                      {order.items[0]?.description ?? "Pedido"}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[#63736b]">{orderStatusLabels[order.status]}</span>
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
