import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { PortalHeader } from "@/components/portal/portal-header";
import { requirePortalClient } from "@/lib/client-auth";
import { centsToCurrency, formatLongDate } from "@/lib/format";
import { orderStatusLabels, paymentStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PortalOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const client = await requirePortalClient();
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, clientId: client.id },
    include: {
      currentStage: { select: { id: true, position: true } },
      items: true,
    },
  });
  if (!order) notFound();

  const stages = await prisma.productionStage.findMany({
    where: { companyId: client.companyId, active: true },
    orderBy: { position: "asc" },
    select: { id: true, name: true, position: true },
  });

  const delivered = order.status === "DELIVERED";
  const canceled = order.status === "CANCELED";
  const currentPos = order.currentStage?.position ?? 0;
  const balanceInCents = Math.max(0, order.totalAmountInCents - order.paidAmountInCents);

  return (
    <div className="min-h-[100dvh] bg-shell text-fg">
      <PortalHeader companyName={client.companyName} clientName={client.name} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Link href="/portal" className="inline-flex items-center gap-2 text-sm font-semibold text-body hover:text-primary">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </Link>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-muted">Pedido #{order.number}</p>
              <h1 className="mt-0.5 text-xl font-semibold">{orderStatusLabels[order.status]}</h1>
            </div>
            <Link
              href={`/portal/solicitar?ref=${order.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary px-4 text-sm font-semibold text-primary transition hover:bg-primary-soft"
            >
              <RefreshCw size={15} aria-hidden="true" />
              Pedir mais dessa peça
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-canvas p-3">
              <p className="text-xs text-muted">Entrega prevista</p>
              <p className="mt-0.5 text-sm font-semibold">{formatLongDate(order.deliveryDate)}</p>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3">
              <p className="text-xs text-muted">Pagamento</p>
              <p className="mt-0.5 text-sm font-semibold">{paymentStatusLabels[order.paymentStatus]}</p>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3">
              <p className="text-xs text-muted">Saldo</p>
              <p className="mt-0.5 text-sm font-semibold">{centsToCurrency(balanceInCents)}</p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-base font-semibold">Andamento da produção</h2>
          {canceled ? (
            <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger-dark">Este pedido foi cancelado.</p>
          ) : stages.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{orderStatusLabels[order.status]}</p>
          ) : (
            <ol className="mt-4 space-y-0">
              {stages.map((stage, index) => {
                const done = delivered || stage.position < currentPos;
                const current = !delivered && stage.position === currentPos;
                const isLast = index === stages.length - 1;
                return (
                  <li key={stage.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                          done
                            ? "border-primary bg-primary text-white"
                            : current
                              ? "border-primary bg-surface text-primary"
                              : "border-line bg-surface text-faint"
                        }`}
                      >
                        {done ? <Check size={14} aria-hidden="true" /> : index + 1}
                      </span>
                      {!isLast ? <span className={`w-0.5 flex-1 ${done ? "bg-primary" : "bg-tint"}`} style={{ minHeight: 24 }} /> : null}
                    </div>
                    <div className={`pb-6 ${current ? "font-semibold text-fg" : "text-muted"}`}>
                      <p className="text-sm">{stage.name}</p>
                      {current ? <p className="text-xs font-medium text-primary">Etapa atual</p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-base font-semibold">Itens do pedido</h2>
          <ul className="mt-3 divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{item.description}</span>
                  {item.size || item.color ? (
                    <span className="text-muted"> · {[item.size, item.color].filter(Boolean).join(" / ")}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-muted">{item.quantity} un.</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="font-medium text-body">Total</span>
            <span className="font-semibold">{centsToCurrency(order.totalAmountInCents)}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
