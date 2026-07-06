import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Package, Plus, SlidersHorizontal } from "lucide-react";
import { deleteMaterialAction, registerStockMovementAction, updateMaterialAction } from "@/app/estoque/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { InlineEdit } from "@/components/inline-edit";
import { MaterialCreateForm } from "@/components/material-create-form";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { ToastForm } from "@/components/toast-form";
import { formatDateTime } from "@/lib/format";
import type { StockMovementType } from "@prisma/client";

type DbMaterial = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentQuantity: number;
  minimumQuantity: number;
  supplier: string | null;
};

type DbMovement = {
  id: string;
  type: StockMovementType;
  quantity: number;
  note: string | null;
  createdAt: Date;
  materialName: string;
  unit: string;
  orderNumber: number | null;
};

type DbStockManagerProps = {
  materials: DbMaterial[];
  movements: DbMovement[];
  canEdit: boolean;
};

const movementLabels: Record<StockMovementType, string> = {
  IN: "Entrada",
  OUT: "Saída",
  ADJUSTMENT: "Ajuste",
};

export function DbStockManager({ materials, movements, canEdit }: DbStockManagerProps) {
  const lowItems = materials.filter((item) => item.currentQuantity <= item.minimumQuantity);
  const supplierCount = new Set(materials.map((item) => item.supplier).filter(Boolean)).size;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Materiais cadastrados" value={String(materials.length)} note="tecidos, linhas e aviamentos" icon={Package} tone="info" />
        <MetricCard label="Estoque baixo" value={String(lowItems.length)} note="precisam reposição" icon={AlertTriangle} tone={lowItems.length > 0 ? "danger" : "neutral"} />
        <MetricCard label="Fornecedores" value={String(supplierCount)} note="vinculados ao estoque" icon={Package} tone="primary" />
      </section>

      {lowItems.length > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-[#f1c0c9] bg-[#fff0f2] p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-[#9f2f42]" size={18} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#9f2f42]">Materiais abaixo do mínimo</p>
            <p className="mt-1 text-sm text-[#66756d]">{lowItems.map((item) => item.name).join(", ")}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <SectionCard eyebrow="Almoxarifado" title="Materiais">
          {materials.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center">
              <Package className="mx-auto text-[#5b68d8]" size={28} aria-hidden="true" />
              <h3 className="mt-3 font-semibold">Nenhum material cadastrado</h3>
              <p className="mt-2 text-sm text-[#66756d]">Cadastre tecidos, linhas e aviamentos para controlar estoque.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {materials.map((item) => {
                const low = item.currentQuantity <= item.minimumQuantity;
                const percent = item.minimumQuantity > 0 ? Math.min(100, Math.round((item.currentQuantity / item.minimumQuantity) * 100)) : 100;
                return (
                  <article key={item.id} className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm transition hover:border-[#c7d3ce]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex size-11 items-center justify-center rounded-lg bg-[#eef1ff] text-[#5b68d8]">
                          <Package size={20} aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="mt-1 text-sm text-[#66756d]">{item.category || "Material"} - {item.supplier || "Fornecedor não informado"}</p>
                        </div>
                      </div>
                      <ConfirmDeleteButton
                        action={deleteMaterialAction}
                        id={item.id}
                        title="Remover material"
                        message={`Excluir o material ${item.name}?`}
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-[#63736b]">Atual / mínimo</span>
                      <strong>{item.currentQuantity}/{item.minimumQuantity} {item.unit}</strong>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#edf2ef]">
                      <div className={`h-2 rounded-full ${low ? "bg-[#c43f54]" : "bg-[#087f7d]"}`} style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <StatusBadge tone={low ? "warn" : "good"}>{low ? "Repor estoque" : "Estoque ok"}</StatusBadge>
                    </div>

                    {canEdit ? (
                      <InlineEdit
                        action={updateMaterialAction}
                        id={item.id}
                        fields={[
                          { name: "name", label: "Material", defaultValue: item.name, required: true },
                          { name: "category", label: "Categoria", defaultValue: item.category ?? "" },
                          { name: "unit", label: "Unidade", defaultValue: item.unit },
                          { name: "min", label: "Estoque mínimo", defaultValue: String(item.minimumQuantity) },
                          { name: "supplier", label: "Fornecedor", defaultValue: item.supplier ?? "" },
                        ]}
                      />
                    ) : null}

                    <ToastForm action={registerStockMovementAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-[#d9e1dd] pt-3">
                      <input type="hidden" name="materialId" value={item.id} />
                      <label className="w-24">
                        <span className="text-xs text-[#63736b]">Tipo</span>
                        <select name="type" className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] bg-white px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4">
                          <option value="IN">Entrada</option>
                          <option value="OUT">Saída</option>
                          <option value="ADJUSTMENT">Ajuste</option>
                        </select>
                      </label>
                      <label className="w-20">
                        <span className="text-xs text-[#63736b]">Qtd.</span>
                        <input name="quantity" type="number" min="0" step="0.01" required className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4" placeholder="0" />
                      </label>
                      <label className="min-w-28 flex-1">
                        <span className="text-xs text-[#63736b]">Observação</span>
                        <input name="note" className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4" placeholder="opcional" />
                      </label>
                      <button className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#087f7d] px-3 text-xs font-semibold text-white transition hover:bg-[#05605e]" title="Registrar movimentação">
                        <Plus size={14} aria-hidden="true" />
                        Lançar
                      </button>
                    </ToastForm>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard eyebrow="Novo material" title="Cadastrar estoque">
          <MaterialCreateForm />
        </SectionCard>
      </section>

      <SectionCard eyebrow="Movimentações" title="Histórico de estoque">
        {movements.length === 0 ? (
          <p className="text-sm text-[#66756d]">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <ul className="divide-y divide-[#edf2ef]">
            {movements.map((movement) => {
              const tone = movement.type === "IN" ? "good" : movement.type === "OUT" ? "warn" : "neutral";
              const Icon = movement.type === "IN" ? ArrowUpCircle : movement.type === "OUT" ? ArrowDownCircle : SlidersHorizontal;
              const sign = movement.type === "IN" ? "+" : movement.type === "OUT" ? "-" : "=";
              return (
                <li key={movement.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="shrink-0 text-[#63736b]" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium">{movement.materialName}</p>
                      <p className="text-xs text-[#8a9890]">
                        {formatDateTime(movement.createdAt)}
                        {movement.orderNumber ? ` - pedido #${movement.orderNumber}` : ""}
                        {movement.note ? ` - ${movement.note}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{sign}{movement.quantity} {movement.unit}</span>
                    <StatusBadge tone={tone}>{movementLabels[movement.type]}</StatusBadge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
