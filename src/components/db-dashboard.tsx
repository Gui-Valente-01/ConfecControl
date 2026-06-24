import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, CreditCard, Package } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { centsToCurrency, formatShortDate } from "@/lib/format";
import { isOrderLate, orderStatusLabels } from "@/lib/status";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

type DashboardStage = {
  id: string;
  name: string;
  color: string | null;
  currentOrders: {
    id: string;
    number: number;
    deliveryDate: Date | null;
    client: { name: string };
    items: { description: string; quantity: number }[];
  }[];
};

type DashboardOrder = {
  id: string;
  number: number;
  deliveryDate: Date | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmountInCents: number;
  client: { name: string };
  items: { description: string; quantity: number }[];
};

type DashboardMaterial = {
  id: string;
  name: string;
  unit: string;
  currentQuantity: number;
  minimumQuantity: number;
};

type DbDashboardProps = {
  orders: DashboardOrder[];
  stages: DashboardStage[];
  materials: DashboardMaterial[];
};

export function DbDashboard({ orders, stages, materials }: DbDashboardProps) {
  const now = new Date();
  const openOrders = orders.filter((order) => !["READY", "DELIVERED", "CANCELED"].includes(order.status)).length;
  const lateOrders = orders.filter((order) => isOrderLate(order.deliveryDate, order.status)).length;
  const lowStock = materials.filter((item) => item.currentQuantity <= item.minimumQuantity);
  const pendingPayments = orders.filter((order) => order.status !== "CANCELED" && order.paymentStatus !== "PAID").length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmountInCents, 0);

  const alerts = [
    lateOrders > 0 ? { text: `${lateOrders} pedido(s) atrasado(s)`, href: "/pedidos", icon: AlertTriangle } : null,
    lowStock.length > 0 ? { text: `${lowStock.length} material(is) abaixo do mínimo`, href: "/estoque", icon: Package } : null,
    pendingPayments > 0 ? { text: `${pendingPayments} pagamento(s) pendente(s)`, href: "/financeiro", icon: CreditCard } : null,
  ].filter((a): a is { text: string; href: string; icon: typeof AlertTriangle } => a !== null);

  const stats = [
    { label: "Pedidos em aberto", value: String(openOrders), note: "acompanhados no quadro", icon: ClipboardList, accent: "bg-[#0f8b8d]" },
    { label: "Atrasados", value: String(lateOrders), note: "prioridade alta", icon: AlertTriangle, accent: "bg-[#d1495b]" },
    { label: "Faturamento previsto", value: centsToCurrency(totalRevenue), note: "somando pedidos reais", icon: CheckCircle2, accent: "bg-[#edae49]" },
    { label: "Estoque baixo", value: String(lowStock.length), note: "materiais precisam reposicao", icon: Package, accent: "bg-[#4c6fff]" },
  ];

  return (
    <>
      {alerts.length > 0 ? (
        <section className="flex flex-wrap gap-3" aria-label="Alertas">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <Link
                key={alert.href}
                href={alert.href}
                className="inline-flex items-center gap-2 rounded-lg border border-[#f0c8ce] bg-[#fdecef] px-3 py-2 text-sm font-semibold text-[#b23647] transition hover:bg-[#fbdfe4]"
              >
                <Icon size={16} aria-hidden="true" />
                {alert.text}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            );
          })}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-lg border border-[#ded7ca] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#766d5d]">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-normal">{stat.value}</p>
                </div>
                <div className={`flex size-10 items-center justify-center rounded-lg text-white ${stat.accent}`}>
                  <Icon size={20} aria-hidden="true" />
                </div>
              </div>
              <p className="mt-4 text-sm text-[#6f675b]">{stat.note}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <SectionCard
          eyebrow="Produção"
          title="Quadro por etapa"
          action={<a href="/producao" className="flex h-10 items-center gap-2 rounded-lg border border-[#d8cfbf] px-3 text-sm font-medium text-[#544d43]">Ver produção<ArrowRight size={16} aria-hidden="true" /></a>}
        >
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {stages.slice(0, 4).map((stage) => (
              <section key={stage.id} className="min-h-72 rounded-lg border border-[#e4ddd1] border-t-4 bg-[#fbf8f1] p-3" style={{ borderTopColor: stage.color || "#0f8b8d" }}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{stage.name}</h3>
                  <StatusBadge>{stage.currentOrders.length}</StatusBadge>
                </div>
                <div className="space-y-3">
                  {stage.currentOrders.slice(0, 3).map((order) => {
                    const firstItem = order.items[0];
                    return (
                      <article key={order.id} className="rounded-lg border border-[#e3dbcd] bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-[#766d5d]">#{order.number}</span>
                          <StatusBadge tone="good">{firstItem?.quantity ?? 0} un.</StatusBadge>
                        </div>
                        <p className="mt-2 text-sm font-semibold">{order.client.name}</p>
                        <p className="mt-1 text-sm text-[#6f675b]">{firstItem?.description || "Pedido sem item"}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Estoque" title="Materiais baixos">
          {lowStock.length === 0 ? (
            <p className="text-sm text-[#6f675b]">Nenhum material abaixo do mínimo.</p>
          ) : (
            <div className="space-y-4">
              {lowStock.slice(0, 4).map((material) => {
                const percentage = material.minimumQuantity > 0 ? Math.min(100, Math.round((material.currentQuantity / material.minimumQuantity) * 100)) : 100;
                return (
                  <div key={material.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{material.name}</span>
                      <span className="text-[#766d5d]">{material.currentQuantity}/{material.minimumQuantity} {material.unit}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#eee8dc]">
                      <div className="h-2 rounded-full bg-[#d1495b]" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard eyebrow="Pedidos" title="Acompanhamento geral" action={<Link href="/pedidos" className="flex h-10 items-center gap-2 rounded-lg border border-[#d8cfbf] px-3 text-sm font-medium text-[#544d43]">Ver todos<ArrowRight size={16} aria-hidden="true" /></Link>}>
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d8cfbf] bg-[#fbf8f1] p-8 text-center">
            <h3 className="font-semibold">Nenhum pedido ainda</h3>
            <p className="mt-2 text-sm text-[#6f675b]">Crie pedidos para alimentar dashboard, produção e financeiro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#766d5d]">
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Produto</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Prazo</th>
                  <th className="border-b border-[#ded7ca] pb-3 font-semibold">Status</th>
                  <th className="border-b border-[#ded7ca] pb-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((order) => {
                  const firstItem = order.items[0];
                  return (
                    <tr key={order.id}>
                      <td className="border-b border-[#eee8dc] py-4 font-mono font-semibold text-[#544d43]">#{order.number}</td>
                      <td className="border-b border-[#eee8dc] py-4 font-medium">{order.client.name}</td>
                      <td className="border-b border-[#eee8dc] py-4 text-[#6f675b]">{firstItem?.description || "Sem item"}</td>
                      <td className="border-b border-[#eee8dc] py-4"><StatusBadge tone={order.deliveryDate && order.deliveryDate < now ? "warn" : "good"}>{formatShortDate(order.deliveryDate)}</StatusBadge></td>
                      <td className="border-b border-[#eee8dc] py-4 text-[#6f675b]">{orderStatusLabels[order.status]}</td>
                      <td className="border-b border-[#eee8dc] py-4 text-right font-semibold">{centsToCurrency(order.totalAmountInCents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
