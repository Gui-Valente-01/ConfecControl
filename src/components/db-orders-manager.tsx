import Link from "next/link";
import { Eye } from "lucide-react";
import { createOrderAction, deleteOrderAction } from "@/app/pedidos/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { OrderForm } from "@/components/order-form";
import { PrioritySelect } from "@/components/priority-select";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { centsToCurrency, formatShortDate } from "@/lib/format";
import { orderPriorityBadge, orderPriorityLabels, orderStatusLabels, paymentStatusLabels } from "@/lib/status";
import type { OrderPriority, OrderStatus, PaymentStatus } from "@prisma/client";

type ClientOption = { id: string; name: string };
type ProductOption = { id: string; name: string; standardPriceInCents: number };
type DbOrder = {
  id: string;
  number: number;
  deliveryDate: Date | null;
  status: OrderStatus;
  priority: OrderPriority;
  paymentStatus: PaymentStatus;
  totalAmountInCents: number;
  client: { name: string };
  items: { description: string; quantity: number }[];
};

type DbOrdersManagerProps = {
  clients: ClientOption[];
  products: ProductOption[];
  orders: DbOrder[];
  canPrioritize: boolean;
  canManage: boolean;
  showFinance: boolean;
};

export function DbOrdersManager({ clients, products, orders, canPrioritize, canManage, showFinance }: DbOrdersManagerProps) {
  const now = new Date();

  return (
    <section className={`grid gap-6 ${canManage ? "xl:grid-cols-[1fr_380px]" : ""}`}>
      <SectionCard
        eyebrow="Fila de pedidos"
        title="Pedidos cadastrados"
        action={<div className="rounded-lg border border-[#d9e1dd] bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{orders.length} pedidos</div>}
      >
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center">
            <h3 className="font-semibold">Nenhum pedido cadastrado</h3>
            <p className="mt-2 text-sm text-[#66756d]">Cadastre clientes e produtos, depois crie o primeiro pedido real.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#63736b]">
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Prioridade</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Itens</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Prazo</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Status</th>
                  {showFinance ? <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Pagamento</th> : null}
                  {showFinance ? <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Total</th> : null}
                  <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const firstItem = order.items[0];
                  const extraItems = order.items.length - 1;
                  const late = order.deliveryDate && order.deliveryDate < now && !["READY", "DELIVERED"].includes(order.status);
                  return (
                    <tr key={order.id} className="transition hover:bg-[#f8faf9]">
                      <td className="border-b border-[#edf2ef] py-4 font-mono font-semibold text-[#405047]">
                        <span className="flex items-center gap-2">
                          {order.priority === "URGENT" || order.priority === "HIGH" ? (
                            <span className={`inline-block h-6 w-1 rounded-full ${order.priority === "URGENT" ? "bg-[#c43f54]" : "bg-[#c88a2b]"}`} aria-hidden="true" />
                          ) : null}
                          <Link href={`/pedidos/${order.id}`} className="hover:underline">#{order.number}</Link>
                        </span>
                      </td>
                      <td className="border-b border-[#edf2ef] py-4">
                        {canPrioritize ? (
                          <PrioritySelect orderId={order.id} value={order.priority} />
                        ) : (
                          <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${orderPriorityBadge[order.priority]}`}>
                            {orderPriorityLabels[order.priority]}
                          </span>
                        )}
                      </td>
                      <td className="border-b border-[#edf2ef] py-4 font-medium">{order.client.name}</td>
                      <td className="border-b border-[#edf2ef] py-4 text-[#66756d]">
                        {firstItem ? `${firstItem.description} (${firstItem.quantity} un.)` : "Sem item"}
                        {extraItems > 0 ? <span className="text-[#8a9890]"> +{extraItems}</span> : null}
                      </td>
                      <td className="border-b border-[#edf2ef] py-4">
                        <StatusBadge tone={late ? "warn" : "good"}>{formatShortDate(order.deliveryDate)}</StatusBadge>
                      </td>
                      <td className="border-b border-[#edf2ef] py-4 text-[#66756d]">{orderStatusLabels[order.status]}</td>
                      {showFinance ? (
                        <td className="border-b border-[#edf2ef] py-4">
                          <StatusBadge tone={order.paymentStatus === "PAID" ? "good" : "neutral"}>{paymentStatusLabels[order.paymentStatus]}</StatusBadge>
                        </td>
                      ) : null}
                      {showFinance ? (
                        <td className="border-b border-[#edf2ef] py-4 text-right font-semibold">{centsToCurrency(order.totalAmountInCents)}</td>
                      ) : null}
                      <td className="border-b border-[#edf2ef] py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/pedidos/${order.id}`}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3ce] bg-white text-[#405047] transition hover:bg-[#eef4f1]"
                            title="Ver detalhes"
                          >
                            <Eye size={16} aria-hidden="true" />
                          </Link>
                          {canManage ? (
                            <ConfirmDeleteButton
                              action={deleteOrderAction}
                              id={order.id}
                              title="Remover pedido"
                              message={`Excluir o pedido #${order.number}? Esta ação não pode ser desfeita.`}
                            />
                          ) : null}
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

      {canManage ? (
        <SectionCard eyebrow="Criação" title="Novo pedido">
          {clients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-6 text-center text-sm text-[#66756d]">
              Cadastre um cliente antes de criar pedidos.
            </div>
          ) : (
            <OrderForm clients={clients} products={products} action={createOrderAction} submitLabel="Salvar pedido" />
          )}
        </SectionCard>
      ) : null}
    </section>
  );
}
