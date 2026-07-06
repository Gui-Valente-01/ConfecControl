import { AlertTriangle, CheckCircle2, CircleDollarSign, CreditCard } from "lucide-react";
import { markPaymentPaidAction } from "@/app/financeiro/actions";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { ToastForm } from "@/components/toast-form";
import { centsToCurrency, formatShortDate } from "@/lib/format";
import { paymentStatusLabels } from "@/lib/status";
import type { PaymentStatus } from "@prisma/client";

type DbPayment = {
  id: string;
  orderId: string;
  amountInCents: number;
  status: PaymentStatus;
  dueDate: Date | null;
  paidAt: Date | null;
  order: {
    number: number;
    paidAmountInCents: number;
    deliveryDate: Date | null;
    client: { name: string };
  };
};

type DbFinanceManagerProps = {
  payments: DbPayment[];
};

export function DbFinanceManager({ payments }: DbFinanceManagerProps) {
  const expected = payments.reduce((sum, payment) => sum + payment.amountInCents, 0);
  const paid = payments.reduce((sum, payment) => sum + (payment.status === "PAID" ? payment.amountInCents : payment.order.paidAmountInCents), 0);
  const receivable = Math.max(0, expected - paid);
  const overdue = payments
    .filter((payment) => payment.status !== "PAID" && payment.order.deliveryDate && payment.order.deliveryDate < new Date())
    .reduce((sum, payment) => sum + payment.amountInCents - payment.order.paidAmountInCents, 0);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Previsto", value: centsToCurrency(expected), note: "pedidos abertos", icon: CircleDollarSign, tone: "primary" as const },
          { label: "Recebido", value: centsToCurrency(paid), note: "pagamentos confirmados", icon: CheckCircle2, tone: "primary" as const },
          { label: "A receber", value: centsToCurrency(receivable), note: "pendente/parcial", icon: CreditCard, tone: "warning" as const },
          { label: "Atrasado", value: centsToCurrency(overdue), note: "precisa cobrança", icon: AlertTriangle, tone: "danger" as const },
        ].map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      <SectionCard eyebrow="Financeiro simples" title="Pagamentos por pedido">
        {payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center">
            <h3 className="font-semibold">Nenhum pagamento registrado</h3>
            <p className="mt-2 text-sm text-[#66756d]">Crie pedidos para gerar financeiro automaticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#63736b]">
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Prazo</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Status</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Recebido</th>
                  <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Total</th>
                  <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border-b border-[#edf2ef] py-4 font-mono font-semibold text-[#405047]">#{payment.order.number}</td>
                    <td className="border-b border-[#edf2ef] py-4 font-medium">{payment.order.client.name}</td>
                    <td className="border-b border-[#edf2ef] py-4">{formatShortDate(payment.order.deliveryDate)}</td>
                    <td className="border-b border-[#edf2ef] py-4">
                      <StatusBadge tone={payment.status === "PAID" ? "good" : "neutral"}>{paymentStatusLabels[payment.status]}</StatusBadge>
                    </td>
                    <td className="border-b border-[#edf2ef] py-4">{centsToCurrency(payment.status === "PAID" ? payment.amountInCents : payment.order.paidAmountInCents)}</td>
                    <td className="border-b border-[#edf2ef] py-4 text-right font-semibold">{centsToCurrency(payment.amountInCents)}</td>
                    <td className="border-b border-[#edf2ef] py-4 text-right">
                      <ToastForm action={markPaymentPaidAction}>
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <input type="hidden" name="orderId" value={payment.orderId} />
                        <input type="hidden" name="amountInCents" value={payment.amountInCents} />
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#c7d3ce] bg-white px-3 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={payment.status === "PAID"}
                        >
                          {payment.status === "PAID" ? <CheckCircle2 size={15} aria-hidden="true" /> : <CircleDollarSign size={15} aria-hidden="true" />}
                          Pago
                        </button>
                      </ToastForm>
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
