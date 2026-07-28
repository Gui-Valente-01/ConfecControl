import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { requireRouteUser } from "@/lib/auth";
import { centsToCurrency, formatShortDate } from "@/lib/format";
import { canSeeFinance } from "@/lib/roles";
import { isOrderLate, orderStatusLabels, paymentStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ClienteDetalhePage({ params }: { params: Params }) {
  const user = await requireRouteUser("/clientes");
  const { id } = await params;
  const showMoney = canSeeFinance(user.role);

  const client = await prisma.client.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      orders: {
        orderBy: [{ orderDate: "desc" }],
        include: {
          items: { select: { description: true, quantity: true }, take: 1 },
          payments: {
            orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
            select: { id: true, amountInCents: true, status: true, method: true, paidAt: true, dueDate: true },
          },
        },
      },
    },
  });
  if (!client) notFound();

  // Um pedido cai em um grupo só: atrasado > em aberto > concluído.
  const finished = client.orders.filter((o) => o.status === "DELIVERED" || o.status === "CANCELED");
  const running = client.orders.filter((o) => !finished.includes(o));
  const late = running.filter((o) => isOrderLate(o.deliveryDate, o.status));
  const open = running.filter((o) => !late.includes(o));

  const totalBought = client.orders.reduce((sum, o) => sum + o.totalAmountInCents, 0);
  const totalPaid = client.orders.reduce((sum, o) => sum + o.paidAmountInCents, 0);
  const balance = totalBought - totalPaid;

  // Só pagamentos que realmente entraram, com a data em que caiu.
  const received = client.orders
    .flatMap((order) => order.payments.map((p) => ({ ...p, orderNumber: order.number, orderId: order.id })))
    .filter((p) => p.paidAt)
    .sort((a, b) => (b.paidAt as Date).getTime() - (a.paidAt as Date).getTime());

  const contactLines = [
    client.contact ? { icon: Phone, text: `${client.contact}${client.phone ? ` · ${client.phone}` : ""}` } : null,
    !client.contact && client.phone ? { icon: Phone, text: client.phone } : null,
    client.email ? { icon: Mail, text: client.email } : null,
    client.address ? { icon: MapPin, text: client.address } : null,
  ].filter(Boolean) as { icon: typeof Phone; text: string }[];

  const orderGroup = (
    title: string,
    rows: typeof client.orders,
    tone: "late" | "open" | "done",
    empty: string,
  ) => (
    <SectionCard
      eyebrow={tone === "late" ? "Precisa de atenção" : tone === "open" ? "Em produção" : "Encerrados"}
      title={title}
      action={<span className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{rows.length}</span>}
    >
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-5 text-center text-sm text-[#66756d]">{empty}</p>
      ) : (
        <ul className="divide-y divide-[#eef2ef]">
          {rows.map((order) => {
            const saldo = order.totalAmountInCents - order.paidAmountInCents;
            return (
              <li key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 first:pt-0 last:pb-0">
                <Link href={`/pedidos/${order.id}`} className="font-mono text-xs font-semibold text-[#05605e] hover:underline">
                  #{order.number}
                </Link>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {order.items[0]?.description ?? "Pedido"}
                  {order.items[0] ? <span className="text-[#8a9890]"> · {order.items[0].quantity} un.</span> : null}
                </span>
                <StatusBadge tone={tone === "late" ? "warn" : tone === "done" ? "dark" : "good"}>
                  {orderStatusLabels[order.status]}
                </StatusBadge>
                <span className={`text-xs tabular-nums ${tone === "late" ? "font-semibold text-[#9f2f42]" : "text-[#8a9890]"}`}>
                  {order.deliveryDate ? formatShortDate(order.deliveryDate) : "sem prazo"}
                </span>
                {showMoney ? (
                  <span className="text-sm font-semibold tabular-nums">
                    {centsToCurrency(order.totalAmountInCents)}
                    {saldo > 0 ? <span className="ml-1 text-xs font-medium text-[#9f2f42]">deve {centsToCurrency(saldo)}</span> : null}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );

  return (
    <AppShell eyebrow="Relacionamento" title={client.name} user={user} search={false}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/clientes"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#d9e1dd] bg-white px-3 text-sm font-semibold text-[#405047] shadow-sm transition hover:border-[#c7d3ce] hover:bg-[#f8faf9]"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Voltar para clientes
        </Link>
        {client.phone ? (
          <a
            href={`https://wa.me/55${client.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#05605e] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#044d4c]"
          >
            <Phone size={15} aria-hidden="true" />
            Falar no WhatsApp
          </a>
        ) : null}
      </div>

      <SectionCard eyebrow="Ficha" title="Dados do cliente">
        <div className="grid gap-3 sm:grid-cols-2">
          {contactLines.length === 0 ? (
            <p className="text-sm text-[#66756d]">Nenhum contato cadastrado.</p>
          ) : (
            contactLines.map((line) => {
              const Icon = line.icon;
              return (
                <p key={line.text} className="flex items-center gap-2 text-sm text-[#405047]">
                  <Icon size={15} className="shrink-0 text-[#8a9890]" aria-hidden="true" />
                  {line.text}
                </p>
              );
            })
          )}
          {client.document ? (
            <p className="text-sm text-[#405047]">
              <span className="text-[#8a9890]">CPF/CNPJ:</span> {client.document}
            </p>
          ) : null}
        </div>
        {client.notes ? <p className="mt-3 border-t border-[#eef2ef] pt-3 text-sm text-[#66756d]">{client.notes}</p> : null}
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pedidos" value={String(client.orders.length)} note={`${running.length} em andamento`} icon={ClipboardList} />
        {showMoney ? (
          <>
            <MetricCard label="Total comprado" value={centsToCurrency(totalBought)} note="somando todos os pedidos" icon={Wallet} tone="info" />
            <MetricCard
              label="Saldo a receber"
              value={centsToCurrency(Math.max(0, balance))}
              note={balance > 0 ? "ainda em aberto" : "tudo quitado"}
              icon={CreditCard}
              tone={balance > 0 ? "warning" : "neutral"}
            />
          </>
        ) : null}
        <MetricCard
          label="Atrasados"
          value={String(late.length)}
          note={late.length > 0 ? "prazo vencido" : "nenhum atraso"}
          icon={late.length > 0 ? AlertTriangle : CheckCircle2}
          tone={late.length > 0 ? "danger" : "neutral"}
        />
      </div>

      {orderGroup("Pedidos atrasados", late, "late", "Nenhum pedido atrasado deste cliente.")}
      {orderGroup("Pedidos em aberto", open, "open", "Nenhum pedido em produção agora.")}
      {orderGroup("Pedidos concluídos", finished, "done", "Nenhum pedido concluído ainda.")}

      {showMoney ? (
        <SectionCard
          eyebrow="Financeiro"
          title="Histórico de pagamentos"
          action={<span className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{centsToCurrency(totalPaid)} recebido</span>}
        >
          {received.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-5 text-center text-sm text-[#66756d]">
              Nenhum pagamento registrado com data ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e4eae6] text-left text-xs uppercase tracking-[0.08em] text-[#63736b]">
                    <th className="py-2 pr-3 font-semibold">Data</th>
                    <th className="py-2 pr-3 font-semibold">Pedido</th>
                    <th className="py-2 pr-3 font-semibold">Forma</th>
                    <th className="py-2 pr-3 font-semibold">Situação</th>
                    <th className="py-2 text-right font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {received.map((payment) => (
                    <tr key={payment.id} className="border-b border-[#eef2ef] last:border-0">
                      <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums text-[#66756d]">
                        {payment.paidAt ? formatShortDate(payment.paidAt) : "-"}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Link href={`/pedidos/${payment.orderId}`} className="font-mono text-xs font-semibold text-[#05605e] hover:underline">
                          #{payment.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-[#66756d]">{payment.method ?? "-"}</td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge tone={payment.status === "PAID" ? "good" : "warn"}>
                          {paymentStatusLabels[payment.status]}
                        </StatusBadge>
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">{centsToCurrency(payment.amountInCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}
    </AppShell>
  );
}
