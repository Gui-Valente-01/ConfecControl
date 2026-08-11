import Link from "next/link";
import { CheckCircle2, Eye, Filter } from "lucide-react";
import { createOrderAction, deleteOrderAction } from "@/app/pedidos/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { OrderForm } from "@/components/order-form";
import { PrioritySelect } from "@/components/priority-select";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { centsToCurrency, formatShortDate } from "@/lib/format";
import type { FiltroPedido } from "@/lib/order-filters";
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
  paidAmountInCents: number;
  client: { name: string };
  items: { description: string; quantity: number }[];
};

type DbOrdersManagerProps = {
  clients: ClientOption[];
  products: ProductOption[];
  serviceSuggestions: { name: string; defaultPriceInCents: number }[];
  orders: DbOrder[];
  canPrioritize: boolean;
  canManage: boolean;
  showFinance: boolean;
  filtro: FiltroPedido | null;
  filtroTexto: { titulo: string; explicacao: string; vazio: string } | null;
  /** Quantos pedidos existem sem filtro nenhum, para o "ver todos" fazer sentido. */
  totalSemFiltro: number;
};

// Atalhos da lista. São os mesmos recortes que o Início usa nos avisos, para a
// pessoa reencontrar aqui o que clicou lá — e não precisar aprender dois nomes
// para a mesma coisa.
const ATALHOS: { filtro: FiltroPedido; rotulo: string }[] = [
  { filtro: "atrasados", rotulo: "Atrasados" },
  { filtro: "hoje", rotulo: "Entregar hoje" },
  { filtro: "material", rotulo: "Aguardando material" },
  { filtro: "producao", rotulo: "Em produção" },
  { filtro: "prontos", rotulo: "Prontos" },
  { filtro: "receber", rotulo: "Falta receber" },
];

export function DbOrdersManager({
  clients,
  products,
  serviceSuggestions,
  orders,
  canPrioritize,
  canManage,
  showFinance,
  filtro,
  filtroTexto,
  totalSemFiltro,
}: DbOrdersManagerProps) {
  const now = new Date();

  return (
    <section className={`grid gap-6 ${canManage ? "xl:grid-cols-[1fr_380px]" : ""}`}>
      <SectionCard
        eyebrow="Fila de pedidos"
        title={filtroTexto ? filtroTexto.titulo : "Pedidos cadastrados"}
        action={
          <div className="rounded-lg border border-line bg-tint px-3 py-2 text-sm font-semibold text-body">
            {orders.length === 1 ? "1 pedido" : `${orders.length} pedidos`}
          </div>
        }
      >
        {/* Atalhos: um clique reduz a lista ao que importa agora. */}
        <nav aria-label="Filtrar pedidos" className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/pedidos"
            aria-current={filtro === null ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-semibold transition ${
              filtro === null
                ? "border-primary bg-primary-soft text-primary-dark"
                : "border-line-strong bg-surface text-body hover:bg-canvas"
            }`}
          >
            Todos ({totalSemFiltro})
          </Link>
          {ATALHOS.map((atalho) => {
            const ativo = filtro === atalho.filtro;
            return (
              <Link
                key={atalho.filtro}
                href={`/pedidos?filtro=${atalho.filtro}`}
                aria-current={ativo ? "page" : undefined}
                className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-semibold transition ${
                  ativo
                    ? "border-primary bg-primary-soft text-primary-dark"
                    : "border-line-strong bg-surface text-body hover:bg-canvas"
                }`}
              >
                {atalho.rotulo}
              </Link>
            );
          })}
        </nav>

        {filtroTexto ? (
          <p className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-3 py-2.5 text-sm text-primary-dark">
            <Filter size={15} aria-hidden="true" />
            <span>{filtroTexto.explicacao}</span>
            <Link href="/pedidos" className="font-semibold underline underline-offset-2">
              Ver todos os pedidos
            </Link>
          </p>
        ) : null}

        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-canvas p-8 text-center">
            {filtroTexto ? (
              <>
                <CheckCircle2 size={24} className="mx-auto text-primary-dark" aria-hidden="true" />
                <h3 className="mt-2 font-semibold">{filtroTexto.vazio}</h3>
                <Link href="/pedidos" className="mt-3 inline-flex text-sm font-semibold text-primary underline underline-offset-2">
                  Ver todos os pedidos
                </Link>
              </>
            ) : (
              <>
                <h3 className="font-semibold">Nenhum pedido cadastrado</h3>
                <p className="mt-2 text-sm text-muted">Cadastre clientes e peças, depois crie o primeiro pedido real.</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="border-b border-line pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-line pb-3 font-semibold">Prioridade</th>
                  <th className="border-b border-line pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-line pb-3 font-semibold">Itens</th>
                  <th className="border-b border-line pb-3 font-semibold">Prazo</th>
                  <th className="border-b border-line pb-3 font-semibold">Status</th>
                  {showFinance ? <th className="border-b border-line pb-3 font-semibold">Pagamento</th> : null}
                  {showFinance ? <th className="border-b border-line pb-3 text-right font-semibold">Total</th> : null}
                  <th className="border-b border-line pb-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const firstItem = order.items[0];
                  const extraItems = order.items.length - 1;
                  const late = order.deliveryDate && order.deliveryDate < now && !["READY", "DELIVERED"].includes(order.status);
                  return (
                    <tr key={order.id} className="transition hover:bg-canvas">
                      <td className="border-b border-divider py-4 font-mono font-semibold text-body">
                        <span className="flex items-center gap-2">
                          {order.priority === "URGENT" || order.priority === "HIGH" ? (
                            <span className={`inline-block h-6 w-1 rounded-full ${order.priority === "URGENT" ? "bg-danger" : "bg-warning"}`} aria-hidden="true" />
                          ) : null}
                          <Link href={`/pedidos/${order.id}`} className="hover:underline">#{order.number}</Link>
                        </span>
                      </td>
                      <td className="border-b border-divider py-4">
                        {canPrioritize ? (
                          <PrioritySelect orderId={order.id} value={order.priority} />
                        ) : (
                          <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${orderPriorityBadge[order.priority]}`}>
                            {orderPriorityLabels[order.priority]}
                          </span>
                        )}
                      </td>
                      <td className="border-b border-divider py-4 font-medium">{order.client.name}</td>
                      <td className="border-b border-divider py-4 text-muted">
                        {firstItem ? `${firstItem.description} (${firstItem.quantity} un.)` : "Sem item"}
                        {extraItems > 0 ? <span className="text-soft"> +{extraItems}</span> : null}
                      </td>
                      <td className="border-b border-divider py-4">
                        <StatusBadge tone={late ? "warn" : "good"}>{formatShortDate(order.deliveryDate)}</StatusBadge>
                      </td>
                      <td className="border-b border-divider py-4 text-muted">{orderStatusLabels[order.status]}</td>
                      {showFinance ? (
                        <td className="border-b border-divider py-4">
                          <StatusBadge tone={order.paymentStatus === "PAID" ? "good" : "neutral"}>{paymentStatusLabels[order.paymentStatus]}</StatusBadge>
                        </td>
                      ) : null}
                      {showFinance ? (
                        <td className="border-b border-divider py-4 text-right font-semibold">{centsToCurrency(order.totalAmountInCents)}</td>
                      ) : null}
                      <td className="border-b border-divider py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/pedidos/${order.id}`}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-line-strong bg-surface text-body transition hover:bg-tint"
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
            <div className="rounded-lg border border-dashed border-line-strong bg-canvas p-6 text-center text-sm text-muted">
              Cadastre um cliente antes de criar pedidos.
            </div>
          ) : (
            <OrderForm
              clients={clients}
              products={products}
              serviceSuggestions={serviceSuggestions}
              action={createOrderAction}
              submitLabel="Salvar pedido"
            />
          )}
        </SectionCard>
      ) : null}
    </section>
  );
}
