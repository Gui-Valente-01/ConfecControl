import Link from "next/link";
import { Eye } from "lucide-react";
import { createOrderAction, deleteOrderAction } from "@/app/pedidos/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { OrderForm } from "@/components/order-form";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { centsToCurrency, formatShortDate } from "@/lib/format";
import { orderStatusLabels, paymentStatusLabels } from "@/lib/status";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

type ClientOption = { id: string; name: string };
type ProductOption = { id: string; name: string; standardPriceInCents: number };
type DbOrder = {
  id: string;
  number: number;
  deliveryDate: Date | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmountInCents: number;
  client: { name: string };
  items: { description: string; quantity: number }[];
};

type DbOrdersManagerProps = {
  clients: ClientOption[];
  products: ProductOption[];
  orders: DbOrder[];
};

export function DbOrdersManager({ clients, products, orders }: DbOrdersManagerProps) {
  const now = new Date();

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <SectionCard
        eyebrow="Fila de pedidos"
        title="Pedidos cadastrados"
        action={<div className="rounded-lg bg-[#f0e7d8] px-3 py-2 text-sm font-semibold text-[#544d43]">{orders.length} pedidos</div>}
      >
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d8cfbf] bg-[#fbf8f1] p-8 text-center">
            <h3 className="font-semibold">Nenhum pedido cadastrado</h3>
            <p className="mt-2 text-sm text-[#6f675b]">Cadastre clientes e produtos, depois crie o primeiro pedido real.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#766d5d]">
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Itens</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Prazo</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Status</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Pagamento</th>
                  <th className="border-b border-[#ded7ca] pb-3 text-right font-semibold">Total</th>
                  <th className="border-b border-[#ded7ca] pb-3 text-right font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const firstItem = order.items[0];
                  const extraItems = order.items.length - 1;
                  const late = order.deliveryDate && order.deliveryDate < now && !["READY", "DELIVERED"].includes(order.status);
                  return (
                    <tr key={order.id}>
                      <td className="border-b border-[#eee8dc] py-4 font-mono font-semibold text-[#544d43]">
                        <Link href={`/pedidos/${order.id}`} className="hover:underline">#{order.number}</Link>
                      </td>
                      <td className="border-b border-[#eee8dc] py-4 font-medium">{order.client.name}</td>
                      <td className="border-b border-[#eee8dc] py-4 text-[#6f675b]">
                        {firstItem ? `${firstItem.description} (${firstItem.quantity} un.)` : "Sem item"}
                        {extraItems > 0 ? <span className="text-[#9a9285]"> +{extraItems}</span> : null}
                      </td>
                      <td className="border-b border-[#eee8dc] py-4">
                        <StatusBadge tone={late ? "warn" : "good"}>{formatShortDate(order.deliveryDate)}</StatusBadge>
                      </td>
                      <td className="border-b border-[#eee8dc] py-4 text-[#6f675b]">{orderStatusLabels[order.status]}</td>
                      <td className="border-b border-[#eee8dc] py-4">
                        <StatusBadge tone={order.paymentStatus === "PAID" ? "good" : "neutral"}>{paymentStatusLabels[order.paymentStatus]}</StatusBadge>
                      </td>
                      <td className="border-b border-[#eee8dc] py-4 text-right font-semibold">{centsToCurrency(order.totalAmountInCents)}</td>
                      <td className="border-b border-[#eee8dc] py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/pedidos/${order.id}`}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-[#d8cfbf] text-[#544d43] transition hover:bg-[#f0e7d8]"
                            title="Ver detalhes"
                          >
                            <Eye size={16} aria-hidden="true" />
                          </Link>
                          <ConfirmDeleteButton
                            action={deleteOrderAction}
                            id={order.id}
                            title="Remover pedido"
                            message={`Excluir o pedido #${order.number}? Esta acao não pode ser desfeita.`}
                          />
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

      <SectionCard eyebrow="Criação" title="Novo pedido">
        {clients.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d8cfbf] bg-[#fbf8f1] p-6 text-center text-sm text-[#6f675b]">
            Cadastre um cliente antes de criar pedidos.
          </div>
        ) : (
          <OrderForm clients={clients} products={products} action={createOrderAction} submitLabel="Salvar pedido" />
        )}
      </SectionCard>
    </section>
  );
}
