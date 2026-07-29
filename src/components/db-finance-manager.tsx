import { AlertTriangle, CheckCircle2, CircleDollarSign, CreditCard, MessageCircle } from "lucide-react";
import { markPaymentPaidAction } from "@/app/financeiro/actions";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { ToastForm } from "@/components/toast-form";
import { centsToCurrency, formatShortDate } from "@/lib/format";
import { paymentStatusLabels } from "@/lib/status";
import { whatsappUrl } from "@/lib/whatsapp";
import type { PaymentStatus } from "@prisma/client";

type DbPayment = {
  id: string;
  orderId: string;
  amountInCents: number;
  status: PaymentStatus;
  method: string | null;
  dueDate: Date | null;
  paidAt: Date | null;
  order: {
    number: number;
    paidAmountInCents: number;
    deliveryDate: Date | null;
    client: { name: string; phone: string | null };
  };
};

type DbFinanceManagerProps = {
  payments: DbPayment[];
};

const DAY = 86400000;

// Quanto ainda falta receber deste pagamento.
function missing(payment: DbPayment) {
  if (payment.status === "PAID") return 0;
  return Math.max(0, payment.amountInCents - payment.order.paidAmountInCents);
}

export function DbFinanceManager({ payments }: DbFinanceManagerProps) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const daysLate = (payment: DbPayment) => {
    const due = payment.order.deliveryDate;
    if (!due || payment.status === "PAID") return 0;
    const diff = Math.floor((today.getTime() - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / DAY);
    return diff > 0 ? diff : 0;
  };

  const expected = payments.reduce((sum, payment) => sum + payment.amountInCents, 0);
  const paid = payments.reduce(
    (sum, payment) => sum + (payment.status === "PAID" ? payment.amountInCents : payment.order.paidAmountInCents),
    0,
  );
  const receivable = Math.max(0, expected - paid);

  // A cobrar: o que ainda não foi quitado. Mais atrasado primeiro, porque é a
  // ordem em que o dono vai pegar o telefone.
  const toCharge = payments
    .filter((payment) => payment.status !== "PAID" && missing(payment) > 0)
    .sort((a, b) => {
      const lateDiff = daysLate(b) - daysLate(a);
      if (lateDiff !== 0) return lateDiff;
      return (a.order.deliveryDate?.getTime() ?? Infinity) - (b.order.deliveryDate?.getTime() ?? Infinity);
    });

  const overdue = toCharge.filter((payment) => daysLate(payment) > 0).reduce((sum, payment) => sum + missing(payment), 0);
  const toChargeTotal = toCharge.reduce((sum, payment) => sum + missing(payment), 0);

  // Recebidos: o histórico, do mais recente para o mais antigo.
  const received = payments
    .filter((payment) => payment.status === "PAID")
    .sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Previsto", value: centsToCurrency(expected), note: "pedidos abertos", icon: CircleDollarSign, tone: "primary" as const },
          { label: "Recebido", value: centsToCurrency(paid), note: `${received.length} pagamento(s)`, icon: CheckCircle2, tone: "primary" as const },
          { label: "A receber", value: centsToCurrency(receivable), note: "pendente/parcial", icon: CreditCard, tone: "warning" as const },
          {
            label: "Atrasado",
            value: centsToCurrency(overdue),
            note: overdue > 0 ? "precisa cobrança" : "nada vencido",
            icon: AlertTriangle,
            tone: overdue > 0 ? ("danger" as const) : ("neutral" as const),
          },
        ].map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      {/* A COBRAR */}
      <SectionCard
        eyebrow="Cobrança"
        title="A cobrar"
        action={
          <span className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">
            {centsToCurrency(toChargeTotal)}
          </span>
        }
      >
        {toCharge.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center">
            <CheckCircle2 size={24} className="mx-auto text-[#05605e]" aria-hidden="true" />
            <h3 className="mt-2 font-semibold">Nada a cobrar</h3>
            <p className="mt-1 text-sm text-[#66756d]">Todos os pedidos estão quitados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#63736b]">
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Prazo</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Situação</th>
                  <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Falta</th>
                  <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {toCharge.map((payment) => {
                  const late = daysLate(payment);
                  const falta = missing(payment);
                  const link = whatsappUrl(
                    payment.order.client.phone,
                    `Olá ${payment.order.client.name}! Passando para lembrar do pedido #${payment.order.number}, com saldo de ${centsToCurrency(falta)}. Qualquer dúvida estou à disposição.`,
                  );
                  return (
                    <tr key={payment.id} className={late > 0 ? "bg-[#fffafa]" : undefined}>
                      <td className="border-b border-[#edf2ef] py-4 font-mono font-semibold text-[#405047]">#{payment.order.number}</td>
                      <td className="border-b border-[#edf2ef] py-4 font-medium">{payment.order.client.name}</td>
                      <td className="border-b border-[#edf2ef] py-4">{formatShortDate(payment.order.deliveryDate)}</td>
                      <td className="border-b border-[#edf2ef] py-4">
                        {late > 0 ? (
                          <StatusBadge tone="warn">
                            {late === 1 ? "Atrasado 1 dia" : `Atrasado ${late} dias`}
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">{paymentStatusLabels[payment.status]}</StatusBadge>
                        )}
                      </td>
                      <td className="border-b border-[#edf2ef] py-4 text-right font-semibold tabular-nums text-[#9f2f42]">
                        {centsToCurrency(falta)}
                        {payment.order.paidAmountInCents > 0 ? (
                          <span className="block text-xs font-normal text-[#8a9890]">
                            de {centsToCurrency(payment.amountInCents)}
                          </span>
                        ) : null}
                      </td>
                      <td className="border-b border-[#edf2ef] py-4">
                        <div className="flex items-center justify-end gap-2">
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener"
                              title={`Cobrar ${payment.order.client.name} no WhatsApp`}
                              aria-label={`Cobrar ${payment.order.client.name} no WhatsApp`}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#bfe0d9] bg-[#e8f6f3] px-3 text-sm font-semibold text-[#05605e] transition hover:bg-[#d9efe9]"
                            >
                              <MessageCircle size={15} aria-hidden="true" />
                              Cobrar
                            </a>
                          ) : (
                            <span className="text-xs text-[#9aa8a0]" title="Cadastre o WhatsApp do cliente para cobrar por aqui">
                              sem WhatsApp
                            </span>
                          )}
                          <ToastForm action={markPaymentPaidAction}>
                            <input type="hidden" name="paymentId" value={payment.id} />
                            <input type="hidden" name="orderId" value={payment.orderId} />
                            <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#c7d3ce] bg-white px-3 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]">
                              <CircleDollarSign size={15} aria-hidden="true" />
                              Recebi
                            </button>
                          </ToastForm>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* RECEBIDOS - o histórico com a data */}
      <SectionCard
        eyebrow="Histórico"
        title="Pagamentos recebidos"
        action={
          <span className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">
            {received.length} pagamento(s)
          </span>
        }
      >
        {received.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center text-sm text-[#66756d]">
            Nenhum pagamento recebido ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#63736b]">
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Pago em</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Forma</th>
                  <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {received.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border-b border-[#edf2ef] py-4 tabular-nums">
                      {payment.paidAt ? (
                        formatShortDate(payment.paidAt)
                      ) : (
                        <span className="text-[#9aa8a0]">data não registrada</span>
                      )}
                    </td>
                    <td className="border-b border-[#edf2ef] py-4 font-mono font-semibold text-[#405047]">#{payment.order.number}</td>
                    <td className="border-b border-[#edf2ef] py-4 font-medium">{payment.order.client.name}</td>
                    <td className="border-b border-[#edf2ef] py-4 text-[#66756d]">{payment.method ?? "-"}</td>
                    <td className="border-b border-[#edf2ef] py-4 text-right font-semibold tabular-nums text-[#05605e]">
                      {centsToCurrency(payment.amountInCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
