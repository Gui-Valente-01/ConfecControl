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
    <div className="min-h-[100dvh] bg-[#f4f6f5] text-[#1c2420]">
      <PortalHeader companyName={client.companyName} clientName={client.name} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Link href="/portal" className="inline-flex items-center gap-2 text-sm font-semibold text-[#405047] hover:text-[#087f7d]">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </Link>

        <div className="rounded-2xl border border-[#d9e1dd] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-[#63736b]">Pedido #{order.number}</p>
              <h1 className="mt-0.5 text-xl font-semibold">{orderStatusLabels[order.status]}</h1>
            </div>
            <Link
              href={`/portal/solicitar?ref=${order.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#087f7d] px-4 text-sm font-semibold text-[#087f7d] transition hover:bg-[#e8f6f3]"
            >
              <RefreshCw size={15} aria-hidden="true" />
              Pedir mais dessa peça
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#e6ece9] bg-[#f8faf9] p-3">
              <p className="text-xs text-[#63736b]">Entrega prevista</p>
              <p className="mt-0.5 text-sm font-semibold">{formatLongDate(order.deliveryDate)}</p>
            </div>
            <div className="rounded-lg border border-[#e6ece9] bg-[#f8faf9] p-3">
              <p className="text-xs text-[#63736b]">Pagamento</p>
              <p className="mt-0.5 text-sm font-semibold">{paymentStatusLabels[order.paymentStatus]}</p>
            </div>
            <div className="rounded-lg border border-[#e6ece9] bg-[#f8faf9] p-3">
              <p className="text-xs text-[#63736b]">Saldo</p>
              <p className="mt-0.5 text-sm font-semibold">{centsToCurrency(balanceInCents)}</p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-[#d9e1dd] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Andamento da produção</h2>
          {canceled ? (
            <p className="mt-3 rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">Este pedido foi cancelado.</p>
          ) : stages.length === 0 ? (
            <p className="mt-3 text-sm text-[#66756d]">{orderStatusLabels[order.status]}</p>
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
                            ? "border-[#087f7d] bg-[#087f7d] text-white"
                            : current
                              ? "border-[#087f7d] bg-white text-[#087f7d]"
                              : "border-[#d9e1dd] bg-white text-[#9aa8a0]"
                        }`}
                      >
                        {done ? <Check size={14} aria-hidden="true" /> : index + 1}
                      </span>
                      {!isLast ? <span className={`w-0.5 flex-1 ${done ? "bg-[#087f7d]" : "bg-[#e0e6e2]"}`} style={{ minHeight: 24 }} /> : null}
                    </div>
                    <div className={`pb-6 ${current ? "font-semibold text-[#1c2420]" : "text-[#66756d]"}`}>
                      <p className="text-sm">{stage.name}</p>
                      {current ? <p className="text-xs font-medium text-[#087f7d]">Etapa atual</p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-[#d9e1dd] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Itens do pedido</h2>
          <ul className="mt-3 divide-y divide-[#e6ece9]">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{item.description}</span>
                  {item.size || item.color ? (
                    <span className="text-[#63736b]"> · {[item.size, item.color].filter(Boolean).join(" / ")}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[#63736b]">{item.quantity} un.</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-[#e6ece9] pt-3 text-sm">
            <span className="font-medium text-[#405047]">Total</span>
            <span className="font-semibold">{centsToCurrency(order.totalAmountInCents)}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
