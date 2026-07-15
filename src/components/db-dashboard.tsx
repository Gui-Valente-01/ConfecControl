import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, CreditCard, Package } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
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

type DashboardPlan = {
  producao: boolean;
  estoque: boolean;
  financeiro: boolean;
};

type DbDashboardProps = {
  orders: DashboardOrder[];
  stages: DashboardStage[];
  materials: DashboardMaterial[];
  plan: DashboardPlan;
};

export function DbDashboard({ orders, stages, materials, plan }: DbDashboardProps) {
  const now = new Date();
  const openOrders = orders.filter((order) => !["READY", "DELIVERED", "CANCELED"].includes(order.status)).length;
  const lateOrders = orders.filter((order) => isOrderLate(order.deliveryDate, order.status)).length;
  const lowStock = materials.filter((item) => item.currentQuantity <= item.minimumQuantity);
  const pendingPayments = orders.filter((order) => order.status !== "CANCELED" && order.paymentStatus !== "PAID").length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmountInCents, 0);

  const alerts = [
    lateOrders > 0 ? { text: `${lateOrders} pedido(s) atrasado(s)`, href: "/pedidos", icon: AlertTriangle } : null,
    plan.estoque && lowStock.length > 0 ? { text: `${lowStock.length} material(is) abaixo do mínimo`, href: "/estoque", icon: Package } : null,
    plan.financeiro && pendingPayments > 0 ? { text: `${pendingPayments} pagamento(s) pendente(s)`, href: "/financeiro", icon: CreditCard } : null,
  ].filter((a): a is { text: string; href: string; icon: typeof AlertTriangle } => a !== null);

  const stats = [
    { label: "Pedidos em aberto", value: String(openOrders), note: "acompanhados no quadro", icon: ClipboardList, tone: "primary" as const },
    { label: "Atrasados", value: String(lateOrders), note: "prioridade alta", icon: AlertTriangle, tone: "danger" as const },
    { label: "Faturamento previsto", value: centsToCurrency(totalRevenue), note: "somando pedidos reais", icon: CheckCircle2, tone: "warning" as const },
    plan.estoque
      ? { label: "Estoque baixo", value: String(lowStock.length), note: "materiais precisam reposição", icon: Package, tone: "info" as const }
      : null,
  ].filter((stat): stat is NonNullable<typeof stat> => stat !== null);

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
                className="inline-flex items-center gap-2 rounded-lg border border-[#f1c0c9] bg-[#fff0f2] px-3 py-2 text-sm font-semibold text-[#9f2f42] transition hover:bg-[#ffe3e8]"
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
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      {plan.producao || plan.estoque ? (
      <section className={`grid gap-6 ${plan.producao && plan.estoque ? "xl:grid-cols-[1.45fr_0.8fr]" : ""}`}>
        {plan.producao ? (
        <SectionCard
          eyebrow="Produção"
          title="Quadro por etapa"
          action={<a href="/producao" className="flex h-10 items-center gap-2 rounded-lg border border-[#c7d3ce] bg-white px-3 text-sm font-medium text-[#405047] transition hover:bg-[#f8faf9]">Ver produção<ArrowRight size={16} aria-hidden="true" /></a>}
        >
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {stages.slice(0, 4).map((stage) => (
              <section key={stage.id} className="min-h-72 rounded-lg border border-[#d9e1dd] border-t-4 bg-[#f8faf9] p-3" style={{ borderTopColor: stage.color || "#087f7d" }}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{stage.name}</h3>
                  <StatusBadge>{stage.currentOrders.length}</StatusBadge>
                </div>
                <div className="space-y-3">
                  {stage.currentOrders.slice(0, 3).map((order) => {
                    const firstItem = order.items[0];
                    return (
                      <article key={order.id} className="rounded-lg border border-[#d9e1dd] bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-[#63736b]">#{order.number}</span>
                          <StatusBadge tone="good">{firstItem?.quantity ?? 0} un.</StatusBadge>
                        </div>
                        <p className="mt-2 text-sm font-semibold">{order.client.name}</p>
                        <p className="mt-1 text-sm text-[#66756d]">{firstItem?.description || "Pedido sem item"}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </SectionCard>
        ) : null}

        {plan.estoque ? (
        <SectionCard eyebrow="Estoque" title="Materiais baixos">
          {lowStock.length === 0 ? (
            <p className="text-sm text-[#66756d]">Nenhum material abaixo do mínimo.</p>
          ) : (
            <div className="space-y-4">
              {lowStock.slice(0, 4).map((material) => {
                const percentage = material.minimumQuantity > 0 ? Math.min(100, Math.round((material.currentQuantity / material.minimumQuantity) * 100)) : 100;
                return (
                  <div key={material.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{material.name}</span>
                      <span className="text-[#63736b]">{material.currentQuantity}/{material.minimumQuantity} {material.unit}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#edf2ef]">
                      <div className="h-2 rounded-full bg-[#c43f54]" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
        ) : null}
      </section>
      ) : null}

      <SectionCard eyebrow="Pedidos" title="Acompanhamento geral" action={<Link href="/pedidos" className="flex h-10 items-center gap-2 rounded-lg border border-[#c7d3ce] bg-white px-3 text-sm font-medium text-[#405047] transition hover:bg-[#f8faf9]">Ver todos<ArrowRight size={16} aria-hidden="true" /></Link>}>
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center">
            <h3 className="font-semibold">Nenhum pedido ainda</h3>
            <p className="mt-2 text-sm text-[#66756d]">Crie pedidos para alimentar dashboard, produção e financeiro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#63736b]">
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Pedido</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Cliente</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Produto</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Prazo</th>
                  <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Status</th>
                  <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((order) => {
                  const firstItem = order.items[0];
                  return (
                    <tr key={order.id}>
                      <td className="border-b border-[#edf2ef] py-4 font-mono font-semibold text-[#405047]">#{order.number}</td>
                      <td className="border-b border-[#edf2ef] py-4 font-medium">{order.client.name}</td>
                      <td className="border-b border-[#edf2ef] py-4 text-[#66756d]">{firstItem?.description || "Sem item"}</td>
                      <td className="border-b border-[#edf2ef] py-4"><StatusBadge tone={order.deliveryDate && order.deliveryDate < now ? "warn" : "good"}>{formatShortDate(order.deliveryDate)}</StatusBadge></td>
                      <td className="border-b border-[#edf2ef] py-4 text-[#66756d]">{orderStatusLabels[order.status]}</td>
                      <td className="border-b border-[#edf2ef] py-4 text-right font-semibold">{centsToCurrency(order.totalAmountInCents)}</td>
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
