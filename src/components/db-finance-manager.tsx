import { CheckCircle2, CircleDollarSign } from "lucide-react";
import { markPaymentPaidAction } from "@/app/financeiro/actions";
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
          ["Previsto", centsToCurrency(expected), "pedidos abertos"],
          ["Recebido", centsToCurrency(paid), "pagamentos confirmados"],
          ["A receber", centsToCurrency(receivable), "pendente/parcial"],
          ["Atrasado", centsToCurrency(overdue), "precisa cobranca"],
        ].map(([label, value, note]) => (
          <article key={label} className="rounded-lg border border-[#ded7ca] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#766d5d]">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            <p className="mt-4 text-sm text-[#6f675b]">{note}</p>
          </article>
        ))}
      </section>

      <SectionCard eyebrow="Financeiro simples" title="Pagamentos por pedido">
        {payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d8cfbf] bg-[#fbf8f1] p-8 text-center">
            <h3 className="font-semibold">Nenhum pagamento registrado</h3>
            <p className="mt-2 text-sm text-[#6f675b]">Crie pedidos para gerar financeiro automaticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#766d5d]">
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Prazo</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Status</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Recebido</th>
                  <th className="border-b border-[#ded7ca] pb-3 text-right font-semibold">Total</th>
                  <th className="border-b border-[#ded7ca] pb-3 text-right font-semibold">Acao</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border-b border-[#eee8dc] py-4 font-mono font-semibold text-[#544d43]">#{payment.order.number}</td>
                    <td className="border-b border-[#eee8dc] py-4 font-medium">{payment.order.client.name}</td>
                    <td className="border-b border-[#eee8dc] py-4">{formatShortDate(payment.order.deliveryDate)}</td>
                    <td className="border-b border-[#eee8dc] py-4">
                      <StatusBadge tone={payment.status === "PAID" ? "good" : "neutral"}>{paymentStatusLabels[payment.status]}</StatusBadge>
                    </td>
                    <td className="border-b border-[#eee8dc] py-4">{centsToCurrency(payment.status === "PAID" ? payment.amountInCents : payment.order.paidAmountInCents)}</td>
                    <td className="border-b border-[#eee8dc] py-4 text-right font-semibold">{centsToCurrency(payment.amountInCents)}</td>
                    <td className="border-b border-[#eee8dc] py-4 text-right">
                      <ToastForm action={markPaymentPaidAction} message={`Pagamento do pedido #${payment.order.number} recebido.`}>
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <input type="hidden" name="orderId" value={payment.orderId} />
                        <input type="hidden" name="amountInCents" value={payment.amountInCents} />
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d8cfbf] px-3 text-sm font-semibold text-[#544d43] disabled:opacity-50"
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
