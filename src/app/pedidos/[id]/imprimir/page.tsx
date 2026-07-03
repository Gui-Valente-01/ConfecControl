import { notFound } from "next/navigation";
import { PrintTrigger } from "@/components/print-trigger";
import { requireUser } from "@/lib/auth";
import { centsToCurrency, formatLongDate } from "@/lib/format";
import { orderPriorityLabels, orderStatusLabels, paymentStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      client: true,
      company: true,
      currentStage: { select: { name: true } },
      partner: { select: { name: true, service: true } },
      items: true,
    },
  });

  if (!order) notFound();

  const balance = Math.max(0, order.totalAmountInCents - order.paidAmountInCents);

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-[#111a16]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{order.company.name}</h1>
          <p className="text-sm text-[#66756d]">Ordem de produção / Recibo</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">Pedido #{order.number}</p>
          <p className="text-sm text-[#66756d]">{formatLongDate(order.orderDate)}</p>
        </div>
      </div>

      <PrintTrigger />

      <section className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold">Cliente</p>
          <p>{order.client.name}</p>
          {order.client.phone ? <p>{order.client.phone}</p> : null}
          {order.client.address ? <p>{order.client.address}</p> : null}
        </div>
        <div className="text-right">
          <p><span className="font-semibold">Status:</span> {orderStatusLabels[order.status]}</p>
          <p><span className="font-semibold">Prioridade:</span> {orderPriorityLabels[order.priority]}</p>
          <p><span className="font-semibold">Prazo:</span> {formatLongDate(order.deliveryDate)}</p>
          {order.assignee ? <p><span className="font-semibold">Responsável:</span> {order.assignee}</p> : null}
          {order.partner ? <p><span className="font-semibold">Terceirizada:</span> {order.partner.name}</p> : null}
        </div>
      </section>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-[#111a16] text-left">
            <th className="py-2">Descrição</th>
            <th className="py-2">Tam./Cor</th>
            <th className="py-2 text-right">Qtd.</th>
            <th className="py-2 text-right">Preço un.</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-[#d9e1dd]">
              <td className="py-2">{item.description}</td>
              <td className="py-2">{[item.size, item.color].filter(Boolean).join(" / ") || "-"}</td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{centsToCurrency(item.unitPriceInCents)}</td>
              <td className="py-2 text-right">{centsToCurrency(item.totalPriceInCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-6 flex justify-end">
        <table className="text-sm">
          <tbody>
            <tr><td className="pr-8 font-semibold">Total</td><td className="text-right">{centsToCurrency(order.totalAmountInCents)}</td></tr>
            <tr><td className="pr-8 font-semibold">Pago</td><td className="text-right">{centsToCurrency(order.paidAmountInCents)}</td></tr>
            <tr><td className="pr-8 font-semibold">Saldo</td><td className="text-right">{centsToCurrency(balance)}</td></tr>
            <tr><td className="pr-8 font-semibold">Pagamento</td><td className="text-right">{paymentStatusLabels[order.paymentStatus]}</td></tr>
          </tbody>
        </table>
      </section>

      {order.internalNotes ? (
        <section className="mt-6 text-sm">
          <p className="font-semibold">Observações</p>
          <p className="whitespace-pre-line">{order.internalNotes}</p>
        </section>
      ) : null}

      <p className="mt-10 text-center text-xs text-[#8a9890]">Gerado pelo ConfecControl</p>
    </main>
  );
}
