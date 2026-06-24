import { AlertTriangle, ArrowRight, ChevronDown, Factory, Filter, Handshake, UserRound } from "lucide-react";
import { moveOrderStageAction, setOrderProductionAction } from "@/app/producao/actions";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { ToastForm } from "@/components/toast-form";
import { formatShortDate } from "@/lib/format";
import { isOrderLate, orderPriorityLabels, orderStatusLabels } from "@/lib/status";
import type { OrderPriority, OrderStatus } from "@prisma/client";

type ProductionOrder = {
  id: string;
  number: number;
  deliveryDate: Date | null;
  status: OrderStatus;
  priority: OrderPriority;
  assignee: string | null;
  partnerId: string | null;
  partner: { name: string } | null;
  client: { name: string };
  items: { description: string; quantity: number }[];
};

type ProductionStage = {
  id: string;
  name: string;
  color: string | null;
  currentOrders: ProductionOrder[];
};

type PartnerOption = { id: string; name: string };
type EmployeeOption = { name: string; sector: string | null };

type DbProductionBoardProps = {
  stages: ProductionStage[];
  stageOptions: { id: string; name: string }[];
  partners: PartnerOption[];
  employees: EmployeeOption[];
  filters: { stage: string; status: string; priority: string };
};

function priorityTone(priority: OrderPriority) {
  if (priority === "URGENT" || priority === "HIGH") return "warn" as const;
  if (priority === "LOW") return "neutral" as const;
  return "dark" as const;
}

function priorityColor(priority: OrderPriority) {
  if (priority === "URGENT") return "#b23647";
  if (priority === "HIGH") return "#edae49";
  if (priority === "LOW") return "#9a9285";
  return "#0f8b8d";
}

const selectClass =
  "mt-1 h-9 w-full rounded-lg border border-[#d8cfbf] bg-white px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4";

export function DbProductionBoard({ stages, stageOptions, partners, employees, filters }: DbProductionBoardProps) {
  const lastStageId = stageOptions[stageOptions.length - 1]?.id;
  const hasFilters = Boolean(filters.stage || filters.status || filters.priority);

  return (
    <>
      <SectionCard eyebrow="Filtros" title="Refinar produção">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="min-w-40 flex-1">
            <span className="text-xs text-[#766d5d]">Etapa</span>
            <select name="stage" defaultValue={filters.stage} className={selectClass}>
              <option value="">Todas</option>
              {stageOptions.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          </label>
          <label className="min-w-40 flex-1">
            <span className="text-xs text-[#766d5d]">Status</span>
            <select name="status" defaultValue={filters.status} className={selectClass}>
              <option value="">Todos</option>
              {(Object.keys(orderStatusLabels) as OrderStatus[]).map((status) => (
                <option key={status} value={status}>{orderStatusLabels[status]}</option>
              ))}
            </select>
          </label>
          <label className="min-w-40 flex-1">
            <span className="text-xs text-[#766d5d]">Prioridade</span>
            <select name="priority" defaultValue={filters.priority} className={selectClass}>
              <option value="">Todas</option>
              {(Object.keys(orderPriorityLabels) as OrderPriority[]).map((priority) => (
                <option key={priority} value={priority}>{orderPriorityLabels[priority]}</option>
              ))}
            </select>
          </label>
          <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1d1b16] px-4 text-sm font-semibold text-white">
            <Filter size={15} aria-hidden="true" />
            Aplicar
          </button>
          {hasFilters ? (
            <a href="/producao" className="inline-flex h-9 items-center rounded-lg border border-[#d8cfbf] px-4 text-sm font-semibold text-[#544d43]">
              Limpar
            </a>
          ) : null}
        </form>
      </SectionCard>

      <SectionCard eyebrow="Kanban" title="Etapas da produção">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {stages.map((stage) => (
            <section
              key={stage.id}
              className="min-h-96 rounded-lg border border-[#e4ddd1] border-t-4 bg-[#fbf8f1] p-3"
              style={{ borderTopColor: stage.color || "#0f8b8d" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Factory size={16} aria-hidden="true" />
                  <h3 className="text-sm font-semibold">{stage.name}</h3>
                </div>
                <StatusBadge>{stage.currentOrders.length}</StatusBadge>
              </div>
              <div className="space-y-3">
                {stage.currentOrders.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[#ded7ca] px-2 py-4 text-center text-xs text-[#9a9285]">
                    Sem pedidos
                  </p>
                ) : null}
                {stage.currentOrders.map((order) => {
                  const firstItem = order.items[0];
                  const late = isOrderLate(order.deliveryDate, order.status);
                  return (
                    <article key={order.id} className="relative rounded-lg border border-[#e3dbcd] bg-white">
                      <ToastForm action={moveOrderStageAction} message={`Pedido #${order.number} avançado.`} className="absolute right-2 top-2 z-10">
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="hidden" name="currentStageId" value={stage.id} />
                        <button
                          type="submit"
                          title="Avançar etapa"
                          aria-label="Avançar etapa"
                          disabled={stage.id === lastStageId}
                          className="flex size-8 items-center justify-center rounded-lg border border-[#d8cfbf] bg-white text-[#0f8b8d] transition hover:bg-[#eef7f6] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowRight size={15} aria-hidden="true" />
                        </button>
                      </ToastForm>
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center gap-2 p-3 pr-12">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: priorityColor(order.priority) }} aria-hidden="true" />
                          <span className="shrink-0 font-mono text-xs font-semibold text-[#766d5d]">#{order.number}</span>
                          <span className="truncate text-sm font-semibold">{order.client.name}</span>
                          {late ? <AlertTriangle size={14} className="ml-auto shrink-0 text-[#b23647]" aria-hidden="true" /> : null}
                          <ChevronDown size={15} className="shrink-0 text-[#9a9285] transition group-open:rotate-180" aria-hidden="true" />
                        </summary>

                        <div className="space-y-3 border-t border-[#eee8dc] p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge tone={priorityTone(order.priority)}>{orderPriorityLabels[order.priority]}</StatusBadge>
                            <StatusBadge tone={late ? "warn" : "good"}>{formatShortDate(order.deliveryDate)}</StatusBadge>
                            {late ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#fdecef] px-2 py-1 text-xs font-semibold text-[#b23647]">
                                <AlertTriangle size={12} aria-hidden="true" />
                                Atrasado
                              </span>
                            ) : null}
                          </div>

                          <p className="text-sm text-[#6f675b]">{firstItem?.description || "Pedido sem item"}</p>
                          <div className="flex items-center gap-1.5 text-xs text-[#766d5d]">
                            <UserRound size={13} aria-hidden="true" />
                            {order.assignee || "Sem responsável"}
                          </div>
                          {order.partner ? (
                            <div className="flex items-center gap-1.5 text-xs text-[#0f696b]">
                              <Handshake size={13} aria-hidden="true" />
                              {order.partner.name}
                            </div>
                          ) : null}
                          <div className="rounded-md bg-[#f5f2ec] px-2 py-2 text-xs font-semibold text-[#544d43]">
                            {firstItem?.quantity ?? 0} unidades
                          </div>

                          <ToastForm action={setOrderProductionAction} message="Pedido atualizado." className="space-y-2">
                            <input type="hidden" name="orderId" value={order.id} />
                            <select name="priority" defaultValue={order.priority} className={selectClass}>
                              {(Object.keys(orderPriorityLabels) as OrderPriority[]).map((priority) => (
                                <option key={priority} value={priority}>{orderPriorityLabels[priority]}</option>
                              ))}
                            </select>
                            <select name="assignee" defaultValue={order.assignee ?? ""} className={selectClass}>
                              <option value="">Sem responsável</option>
                              {order.assignee && !employees.some((e) => e.name === order.assignee) ? (
                                <option value={order.assignee}>{order.assignee}</option>
                              ) : null}
                              {employees.map((employee) => (
                                <option key={employee.name} value={employee.name}>
                                  {employee.name}{employee.sector ? ` (${employee.sector})` : ""}
                                </option>
                              ))}
                            </select>
                            <select name="partnerId" defaultValue={order.partnerId ?? ""} className={selectClass}>
                              <option value="">Sem terceirizada</option>
                              {partners.map((partner) => (
                                <option key={partner.id} value={partner.id}>{partner.name}</option>
                              ))}
                            </select>
                            <button className="h-9 w-full rounded-lg border border-[#d8cfbf] text-xs font-semibold text-[#544d43]">Salvar</button>
                          </ToastForm>

                          <ToastForm action={moveOrderStageAction} message={`Pedido #${order.number} avançado.`} className="space-y-2">
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="hidden" name="currentStageId" value={stage.id} />
                            <input
                              name="note"
                              placeholder="Observação da etapa (opcional)"
                              className="h-9 w-full rounded-lg border border-[#d8cfbf] px-2 text-xs outline-none ring-[#0f8b8d]/20 focus:ring-4"
                            />
                            <button
                              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#d8cfbf] text-sm font-semibold text-[#544d43] disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={stage.id === lastStageId}
                            >
                              Avançar
                              <ArrowRight size={15} aria-hidden="true" />
                            </button>
                          </ToastForm>
                        </div>
                      </details>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
