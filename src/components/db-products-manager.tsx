import { Layers, Plus, Shirt, Trash2 } from "lucide-react";
import { deleteProductAction, updateProductAction } from "@/app/produtos/actions";
import { removeProductMaterialAction, setProductMaterialAction } from "@/app/estoque/actions";
import { InlineEdit } from "@/components/inline-edit";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ProductCreateForm } from "@/components/product-create-form";
import { ToastForm } from "@/components/toast-form";
import { SectionCard } from "@/components/section-card";
import { ServicesManager } from "@/components/services-manager";
import { describeBlockedDeletion, describeDeletion } from "@/lib/deletion";
import { centsToCurrency, centsToInput } from "@/lib/format";

type BomEntry = {
  id: string;
  materialId: string;
  quantityPerUnit: number;
  material: { name: string; unit: string; costPerUnitInCents: number };
};

// Quanto o material de uma peça custa: consumo por unidade x preço da unidade.
function bomLineCost(entry: BomEntry) {
  return Math.round(entry.quantityPerUnit * entry.material.costPerUnitInCents);
}

type DbProduct = {
  id: string;
  name: string;
  category: string | null;
  fabric: string | null;
  standardPriceInCents: number;
  costInCents: number;
  averageProductionDays: number | null;
  kind: "PRODUCT" | "SERVICE";
  bom: BomEntry[];
  _count: { items: number };
};

type MaterialOption = { id: string; name: string; unit: string };
type ServiceOption = { id: string; name: string; defaultPriceInCents: number };

type DbProductsManagerProps = {
  products: DbProduct[];
  materials: MaterialOption[];
  services: ServiceOption[];
  canEdit: boolean;
};

export function DbProductsManager({ products, materials, services, canEdit }: DbProductsManagerProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <SectionCard
        eyebrow="Produtos"
        title="Peças cadastradas"
        action={<div className="rounded-lg border border-[#d9e1dd] bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{products.length} peças</div>}
      >
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center">
            <Shirt className="mx-auto text-[#087f7d]" size={28} aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Nenhuma peça cadastrada</h3>
            <p className="mt-2 text-sm text-[#66756d]">Cadastre produtos para usar nos pedidos reais.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm transition hover:border-[#c7d3ce]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-[#e8f6f3] text-[#05605e]">
                      <Shirt size={22} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{product.name}</h3>
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                            product.kind === "SERVICE"
                              ? "border-[#c6d2f0] bg-[#eef1ff] text-[#3a48b0]"
                              : "border-[#bfe0d9] bg-[#e8f6f3] text-[#05605e]"
                          }`}
                        >
                          {product.kind === "SERVICE" ? "Serviço na peça do cliente" : "Peça própria"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#66756d]">{product.category || "Sem categoria"}</p>
                    </div>
                  </div>
                  <ConfirmDeleteButton
                    action={deleteProductAction}
                    id={product.id}
                    title="Remover peça"
                    message={describeDeletion({
                      tipo: "a peça",
                      nome: product.name,
                      apaga: [
                        { count: product.bom.length, singular: "material da ficha técnica", plural: "materiais da ficha técnica" },
                      ],
                    })}
                    blockedReason={describeBlockedDeletion({
                      tipo: "a peça",
                      nome: product.name,
                      bloqueios: [{ count: product._count.items, singular: "item de pedido", plural: "itens de pedido" }],
                      saida: "Apagar agora bagunçaria o histórico e o relatório de custo.",
                    })}
                  />
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#63736b]">Tecido</dt>
                    <dd className="font-medium">{product.fabric || "A definir"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#63736b]">Valor padrão</dt>
                    <dd className="font-medium">{centsToCurrency(product.standardPriceInCents)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#63736b]">Prazo médio</dt>
                    <dd className="font-medium">{product.averageProductionDays ? `${product.averageProductionDays} dias` : "A definir"}</dd>
                  </div>
                </dl>

                {canEdit ? (
                  <InlineEdit
                    action={updateProductAction}
                    id={product.id}
                    fields={[
                      { name: "name", label: "Nome", defaultValue: product.name, required: true },
                      { name: "category", label: "Categoria", defaultValue: product.category ?? "" },
                      { name: "fabric", label: "Tecido", defaultValue: product.fabric ?? "" },
                      { name: "price", label: "Valor padrão (R$)", defaultValue: centsToInput(product.standardPriceInCents) },
                      { name: "cost", label: "Outros custos por peça (R$) - facção, mão de obra", defaultValue: centsToInput(product.costInCents) },
                      { name: "time", label: "Prazo médio (dias)", defaultValue: product.averageProductionDays ? String(product.averageProductionDays) : "" },
                    ]}
                  />
                ) : null}

                <div className="mt-4 rounded-lg border border-[#d9e1dd] bg-[#f8faf9] p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#405047]">
                    <Layers size={15} aria-hidden="true" />
                    Ficha técnica (consumo por unidade)
                  </div>

                  {product.bom.length === 0 ? (
                    <p className="mt-2 text-xs text-[#8a9890]">Nenhum material vinculado. A baixa automática só ocorre com a ficha preenchida.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {product.bom.map((entry) => {
                        const lineCost = bomLineCost(entry);
                        return (
                          <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate">{entry.material.name}</span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span className="text-xs text-[#8a9890] tabular-nums">{entry.quantityPerUnit} {entry.material.unit}</span>
                              <span className="font-medium tabular-nums">
                                {entry.material.costPerUnitInCents > 0 ? centsToCurrency(lineCost) : "-"}
                              </span>
                              <ToastForm action={removeProductMaterialAction}>
                                <input type="hidden" name="id" value={entry.id} />
                                <button className="text-[#9f2f42]" title="Remover material da ficha" aria-label="Remover material da ficha">
                                  <Trash2 size={13} aria-hidden="true" />
                                </button>
                              </ToastForm>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Custo real da peça: materiais da ficha + serviços + outros custos */}
                  {product.bom.length > 0 ? (
                    (() => {
                      const materialCost = product.bom.reduce((sum, entry) => sum + bomLineCost(entry), 0);
                      const totalCost = materialCost + product.costInCents;
                      const profit = product.standardPriceInCents - totalCost;
                      const margin = product.standardPriceInCents > 0 ? Math.round((profit / product.standardPriceInCents) * 100) : 0;
                      const semPreco = product.bom.filter((e) => e.material.costPerUnitInCents <= 0);
                      return (
                        <div className="mt-3 border-t border-[#d9e1dd] pt-2.5 text-sm">
                          <div className="flex items-center justify-between text-[#66756d]">
                            <span>{product.kind === "SERVICE" ? "Materiais (tinta, linha...)" : "Materiais"}</span>
                            <span className="tabular-nums">{centsToCurrency(materialCost)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[#66756d]">
                            <span>Outros custos</span>
                            <span className="tabular-nums">{centsToCurrency(product.costInCents)}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between border-t border-[#e7ece9] pt-1 font-semibold">
                            <span>Custo por peça</span>
                            <span className="tabular-nums">{centsToCurrency(totalCost)}</span>
                          </div>
                          {product.standardPriceInCents > 0 ? (
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-[#66756d]">Lucro por peça</span>
                              <span className={`font-semibold tabular-nums ${profit > 0 ? "text-[#05605e]" : "text-[#9f2f42]"}`}>
                                {centsToCurrency(profit)} <span className="text-xs font-medium">({margin}%)</span>
                              </span>
                            </div>
                          ) : null}
                          {semPreco.length > 0 ? (
                            <p className="mt-2 rounded bg-[#fff7dd] px-2 py-1 text-xs text-[#7b5a0b]">
                              Sem preço em: {semPreco.map((e) => e.material.name).join(", ")}. Cadastre no Estoque para o custo ficar completo.
                            </p>
                          ) : null}
                        </div>
                      );
                    })()
                  ) : null}

                  {materials.length > 0 ? (
                    <ToastForm action={setProductMaterialAction} className="mt-3 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="productId" value={product.id} />
                      <label className="min-w-32 flex-1">
                        <span className="text-xs text-[#63736b]">Material</span>
                        <select name="materialId" required className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] bg-white px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4">
                          {materials.map((material) => (
                            <option key={material.id} value={material.id}>{material.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="w-20">
                        <span className="text-xs text-[#63736b]">Qtd/un</span>
                        <input name="quantityPerUnit" type="number" min="0" step="0.001" required className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4" placeholder="1,5" />
                      </label>
                      <button className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#087f7d] px-3 text-xs font-semibold text-white transition hover:bg-[#05605e]">
                        <Plus size={14} aria-hidden="true" />
                        Vincular
                      </button>
                    </ToastForm>
                  ) : (
                    <p className="mt-2 text-xs text-[#8a9890]">Cadastre materiais no estoque para montar a ficha técnica.</p>
                  )}
                </div>

              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="space-y-6">
        <SectionCard eyebrow="Novo produto" title="Cadastrar peça">
          <ProductCreateForm />
        </SectionCard>
        <ServicesManager services={services} canEdit={canEdit} />
      </div>
    </section>
  );
}
