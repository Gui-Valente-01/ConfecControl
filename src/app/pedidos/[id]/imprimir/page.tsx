import { notFound } from "next/navigation";
import { PrintTrigger } from "@/components/print-trigger";
import { requireCapability } from "@/lib/auth";
import { roleHasCapability } from "@/lib/capabilities";
import { centsToCurrency, formatLongDate } from "@/lib/format";
import { orderPriorityLabels, orderStatusLabels, paymentStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCapability("orders.print");
  const { id } = await params;

  // A oficina precisa da ficha, mas a Producao nao pode ver dinheiro. Entao a
  // ficha sai para os dois -- e o que muda e o que vem impresso nela.
  const mostraValores = roleHasCapability(user.role, "finance.read");

  const order = await prisma.order.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      client: true,
      company: true,
      currentStage: { select: { name: true } },
      partner: { select: { name: true, service: true } },
      items: true,
      services: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  const balance = Math.max(0, order.totalAmountInCents - order.paidAmountInCents);

  return (
    // A margem do papel vem do @page (globals.css). Aqui o padding serve só
    // para a visualização na tela, e some na impressão para não somar duas
    // margens e empurrar o conteúdo para o canto.
    <main className="mx-auto max-w-3xl bg-white p-8 text-ink print:max-w-none print:p-0 print:text-black">
      <div className="mb-6 flex items-start justify-between gap-4 border-b-2 border-ink pb-4 print:mb-4">
        <div>
          <h1 className="text-2xl font-bold">{order.company.name}</h1>
          <p className="text-sm text-muted print:text-[#333]">Ordem de produção / Recibo</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">Pedido #{order.number}</p>
          <p className="text-sm text-muted print:text-[#333]">{formatLongDate(order.orderDate)}</p>
        </div>
      </div>

      <PrintTrigger />

      <section className="print-keep mt-6 grid grid-cols-2 gap-4 text-sm print:mt-4">
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

      {/* Larguras fixas para os números não dançarem entre um pedido e outro:
          duas folhas do mesmo dia saem com as colunas no mesmo lugar. */}
      <table className="mt-6 w-full table-fixed border-collapse text-sm print:mt-4">
        {/* Sem as colunas de dinheiro a largura precisa ser redistribuida:
            colgroup com mais colunas do que a tabela desalinha tudo. */}
        <colgroup>
          <col className={mostraValores ? "w-[38%]" : "w-[55%]"} />
          <col className={mostraValores ? "w-[17%]" : "w-[30%]"} />
          <col className={mostraValores ? "w-[9%]" : "w-[15%]"} />
          {mostraValores ? (
            <>
              <col className="w-[18%]" />
              <col className="w-[18%]" />
            </>
          ) : null}
        </colgroup>
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="py-2">Descrição</th>
            <th className="py-2">Tam./Cor</th>
            <th className="py-2 text-right">Qtd.</th>
            {mostraValores ? (
              <>
                <th className="py-2 text-right">Preço un.</th>
                <th className="py-2 text-right">Total</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-line print:border-[#999]">
              <td className="py-2 align-top break-words">{item.description}</td>
              <td className="py-2 align-top break-words">{[item.size, item.color].filter(Boolean).join(" / ") || "-"}</td>
              <td className="py-2 text-right align-top tabular-nums">{item.quantity}</td>
              {mostraValores ? (
                <>
                  <td className="py-2 text-right align-top tabular-nums">{centsToCurrency(item.unitPriceInCents)}</td>
                  <td className="py-2 text-right align-top tabular-nums">{centsToCurrency(item.totalPriceInCents)}</td>
                </>
              ) : null}
            </tr>
          ))}
          {order.services.map((service) => (
            <tr key={service.id} className="border-b border-line print:border-[#999]">
              <td className="py-2 align-top break-words">
                {service.name} <span className="text-muted print:text-[#333]">(serviço)</span>
              </td>
              <td className="py-2 align-top">-</td>
              <td className="py-2 text-right align-top">-</td>
              {mostraValores ? (
                <>
                  <td className="py-2 text-right align-top">-</td>
                  <td className="py-2 text-right align-top tabular-nums">{centsToCurrency(service.priceInCents)}</td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {mostraValores ? (
      <section className="print-keep mt-6 flex justify-end print:mt-4">
        <table className="text-sm">
          <tbody>
            <tr><td className="pr-8 font-semibold">Total</td><td className="text-right tabular-nums">{centsToCurrency(order.totalAmountInCents)}</td></tr>
            <tr><td className="pr-8 font-semibold">Pago</td><td className="text-right tabular-nums">{centsToCurrency(order.paidAmountInCents)}</td></tr>
            <tr className="border-t border-ink"><td className="pr-8 pt-1 font-bold">Saldo</td><td className="pt-1 text-right font-bold tabular-nums">{centsToCurrency(balance)}</td></tr>
            <tr><td className="pr-8 font-semibold">Pagamento</td><td className="text-right">{paymentStatusLabels[order.paymentStatus]}</td></tr>
          </tbody>
        </table>
      </section>
      ) : null}

      {order.internalNotes ? (
        <section className="print-keep mt-6 text-sm print:mt-4">
          <p className="font-semibold">Observações</p>
          <p className="whitespace-pre-line">{order.internalNotes}</p>
        </section>
      ) : null}

      <p className="mt-10 text-center text-xs text-soft print:mt-6 print:text-[#555]">Gerado pelo ConfecControl</p>
    </main>
  );
}
