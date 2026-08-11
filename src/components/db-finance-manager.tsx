import { AlertTriangle, CheckCircle2, CircleDollarSign, CreditCard, MessageCircle, Trash2 } from "lucide-react";
import { deletePaymentAction, registerPaymentAction } from "@/app/financeiro/actions";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { ToastForm } from "@/components/toast-form";
import { centsToCurrency, formatShortDate } from "@/lib/format";
import { computeBalance, sumReceipts } from "@/lib/payments";
import { whatsappUrl } from "@/lib/whatsapp";

type OrderRow = {
  id: string;
  number: number;
  totalAmountInCents: number;
  deliveryDate: Date | null;
  client: { name: string; phone: string | null };
  payments: { amountInCents: number }[];
};

type ReceiptRow = {
  id: string;
  amountInCents: number;
  method: string | null;
  note: string | null;
  paidAt: Date | null;
  order: { id: string; number: number; client: { name: string } };
};

type DbFinanceManagerProps = {
  orders: OrderRow[];
  receipts: ReceiptRow[];
  canDelete: boolean;
};

const DAY = 86400000;

export function DbFinanceManager({ orders, receipts, canDelete }: DbFinanceManagerProps) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const daysLate = (order: OrderRow) => {
    if (!order.deliveryDate) return 0;
    const due = order.deliveryDate;
    const diff = Math.floor((today.getTime() - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / DAY);
    return diff > 0 ? diff : 0;
  };

  const expected = orders.reduce((sum, order) => sum + order.totalAmountInCents, 0);
  const paid = orders.reduce((sum, order) => sum + sumReceipts(order.payments), 0);
  const receivable = Math.max(0, expected - paid);

  // Mais atrasado primeiro: é a ordem em que se pega o telefone.
  const toCharge = orders
    .map((order) => ({ order, balance: computeBalance(order.totalAmountInCents, order.payments), late: daysLate(order) }))
    .filter((row) => row.balance > 0)
    .sort((a, b) => b.late - a.late || (a.order.deliveryDate?.getTime() ?? Infinity) - (b.order.deliveryDate?.getTime() ?? Infinity));

  const overdue = toCharge.filter((row) => row.late > 0).reduce((sum, row) => sum + row.balance, 0);
  const toChargeTotal = toCharge.reduce((sum, row) => sum + row.balance, 0);

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Previsto", value: centsToCurrency(expected), note: `${orders.length} pedido(s)`, icon: CircleDollarSign, tone: "primary" as const },
          { label: "Recebido", value: centsToCurrency(paid), note: `${receipts.length} recebimento(s)`, icon: CheckCircle2, tone: "primary" as const },
          { label: "A receber", value: centsToCurrency(receivable), note: "saldo dos pedidos", icon: CreditCard, tone: "warning" as const },
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
        action={<span className="rounded-lg bg-tint px-3 py-2 text-sm font-semibold text-body">{centsToCurrency(toChargeTotal)}</span>}
      >
        {toCharge.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-canvas p-8 text-center">
            <CheckCircle2 size={24} className="mx-auto text-primary-dark" aria-hidden="true" />
            <h3 className="mt-2 font-semibold">Nada a cobrar</h3>
            <p className="mt-1 text-sm text-muted">Todos os pedidos estão quitados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="border-b border-line pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-line pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-line pb-3 font-semibold">Prazo</th>
                  <th className="border-b border-line pb-3 font-semibold">Situação</th>
                  <th className="border-b border-line pb-3 text-right font-semibold">Falta</th>
                  <th className="border-b border-line pb-3 text-right font-semibold">Registrar recebimento</th>
                </tr>
              </thead>
              <tbody>
                {toCharge.map(({ order, balance, late }) => {
                  const recebido = sumReceipts(order.payments);
                  const link = whatsappUrl(
                    order.client.phone,
                    `Olá ${order.client.name}! Passando para lembrar do pedido #${order.number}, com saldo de ${centsToCurrency(balance)}. Qualquer dúvida estou à disposição.`,
                  );
                  return (
                    <tr key={order.id} className={late > 0 ? "bg-danger-soft" : undefined}>
                      <td className="border-b border-divider py-4 font-mono font-semibold text-body">#{order.number}</td>
                      <td className="border-b border-divider py-4 font-medium">{order.client.name}</td>
                      <td className="border-b border-divider py-4">{formatShortDate(order.deliveryDate)}</td>
                      <td className="border-b border-divider py-4">
                        {late > 0 ? (
                          <StatusBadge tone="warn">{late === 1 ? "Atrasado 1 dia" : `Atrasado ${late} dias`}</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">{recebido > 0 ? "Parcial" : "Pendente"}</StatusBadge>
                        )}
                      </td>
                      <td className="border-b border-divider py-4 text-right font-semibold tabular-nums text-danger-dark">
                        {centsToCurrency(balance)}
                        {recebido > 0 ? (
                          <span className="block text-xs font-normal text-soft">
                            já pagou {centsToCurrency(recebido)}
                          </span>
                        ) : null}
                      </td>
                      <td className="border-b border-divider py-4">
                        <div className="flex items-center justify-end gap-2">
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener"
                              title={`Cobrar ${order.client.name} no WhatsApp`}
                              aria-label={`Cobrar ${order.client.name} no WhatsApp pelo pedido ${order.number}`}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-3 text-sm font-semibold text-primary-dark transition hover:bg-primary-soft"
                            >
                              <MessageCircle size={15} aria-hidden="true" />
                              Cobrar
                            </a>
                          ) : null}
                          <ToastForm action={registerPaymentAction} className="flex items-center gap-1.5">
                            <input type="hidden" name="orderId" value={order.id} />
                            <input
                              name="amount"
                              placeholder={centsToCurrency(balance)}
                              aria-label={`Valor recebido do pedido ${order.number}. Em branco registra o saldo inteiro.`}
                              className="h-9 w-28 rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                            />
                            <button
                              aria-label={`Registrar recebimento do pedido ${order.number}`}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
                            >
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
            <p className="mt-3 text-xs text-soft">
              Deixe o valor em branco para registrar o saldo inteiro, ou digite quanto entrou para lançar um recebimento parcial.
            </p>
          </div>
        )}
      </SectionCard>

      {/* HISTÓRICO */}
      <SectionCard
        eyebrow="Histórico"
        title="Recebimentos"
        action={<span className="rounded-lg bg-tint px-3 py-2 text-sm font-semibold text-body">{receipts.length} lançamento(s)</span>}
      >
        {receipts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-canvas p-8 text-center text-sm text-muted">
            Nenhum recebimento registrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="border-b border-line pb-3 font-semibold">Recebido em</th>
                  <th className="border-b border-line pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-line pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-line pb-3 font-semibold">O que foi</th>
                  <th className="border-b border-line pb-3 text-right font-semibold">Valor</th>
                  {canDelete ? <th className="border-b border-line pb-3" /> : null}
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="border-b border-divider py-4 tabular-nums">
                      {receipt.paidAt ? formatShortDate(receipt.paidAt) : <span className="text-faint">sem data</span>}
                    </td>
                    <td className="border-b border-divider py-4 font-mono font-semibold text-body">#{receipt.order.number}</td>
                    <td className="border-b border-divider py-4 font-medium">{receipt.order.client.name}</td>
                    <td className="border-b border-divider py-4 text-muted">
                      {receipt.note ?? "Recebimento"}
                      {receipt.method ? <span className="block text-xs text-soft">{receipt.method}</span> : null}
                    </td>
                    <td className="border-b border-divider py-4 text-right font-semibold tabular-nums text-primary-dark">
                      {centsToCurrency(receipt.amountInCents)}
                    </td>
                    {canDelete ? (
                      <td className="border-b border-divider py-4 text-right">
                        <ToastForm
                          action={deletePaymentAction}
                          confirm={`Remover o recebimento de ${centsToCurrency(receipt.amountInCents)} do pedido #${receipt.order.number}? O saldo volta a ficar em aberto.`}
                        >
                          <input type="hidden" name="paymentId" value={receipt.id} />
                          <button
                            className="text-danger-dark transition hover:text-danger-dark"
                            title={`Remover recebimento do pedido ${receipt.order.number}`}
                            aria-label={`Remover recebimento de ${centsToCurrency(receipt.amountInCents)} do pedido ${receipt.order.number}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </ToastForm>
                      </td>
                    ) : null}
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
