import { Layers, Plus, Shirt, Trash2 } from "lucide-react";
import { deleteProductAction, updateProductAction } from "@/app/produtos/actions";
import { removeProductMaterialAction, setProductMaterialAction } from "@/app/estoque/actions";
import { InlineEdit } from "@/components/inline-edit";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ProductCreateForm } from "@/components/product-create-form";
import { SectionCard } from "@/components/section-card";
import { centsToCurrency, centsToInput } from "@/lib/format";

type BomEntry = {
  id: string;
  materialId: string;
  quantityPerUnit: number;
  material: { name: string; unit: string };
};

type DbProduct = {
  id: string;
  name: string;
  category: string | null;
  fabric: string | null;
  standardPriceInCents: number;
  costInCents: number;
  averageProductionDays: number | null;
  bom: BomEntry[];
};

type MaterialOption = { id: string; name: string; unit: string };

type DbProductsManagerProps = {
  products: DbProduct[];
  materials: MaterialOption[];
  canEdit: boolean;
};

export function DbProductsManager({ products, materials, canEdit }: DbProductsManagerProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <SectionCard
        eyebrow="Produtos"
        title="Peças cadastradas"
        action={<div className="rounded-lg bg-[#f0e7d8] px-3 py-2 text-sm font-semibold text-[#544d43]">{products.length} peças</div>}
      >
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d8cfbf] bg-[#fbf8f1] p-8 text-center">
            <Shirt className="mx-auto text-[#0f8b8d]" size={28} aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Nenhuma peça cadastrada</h3>
            <p className="mt-2 text-sm text-[#6f675b]">Cadastre produtos para usar nos pedidos reais.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className="rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-white text-[#0f8b8d]">
                      <Shirt size={22} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="mt-1 text-sm text-[#6f675b]">{product.category || "Sem categoria"}</p>
                    </div>
                  </div>
                  <ConfirmDeleteButton
                    action={deleteProductAction}
                    id={product.id}
                    title="Remover peça"
                    message={`Excluir a peça ${product.name}?`}
                  />
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#766d5d]">Tecido</dt>
                    <dd className="font-medium">{product.fabric || "A definir"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#766d5d]">Valor padrão</dt>
                    <dd className="font-medium">{centsToCurrency(product.standardPriceInCents)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#766d5d]">Prazo medio</dt>
                    <dd className="font-medium">{product.averageProductionDays ? `${product.averageProductionDays} dias` : "A definir"}</dd>
                  </div>
                </dl>

                {canEdit ? (
                  <InlineEdit
                    action={updateProductAction}
                    id={product.id}
                    message="Peça atualizada."
                    fields={[
                      { name: "name", label: "Nome", defaultValue: product.name, required: true },
                      { name: "category", label: "Categoria", defaultValue: product.category ?? "" },
                      { name: "fabric", label: "Tecido", defaultValue: product.fabric ?? "" },
                      { name: "price", label: "Valor padrão (R$)", defaultValue: centsToInput(product.standardPriceInCents) },
                      { name: "cost", label: "Custo (R$)", defaultValue: centsToInput(product.costInCents) },
                      { name: "time", label: "Prazo médio (dias)", defaultValue: product.averageProductionDays ? String(product.averageProductionDays) : "" },
                    ]}
                  />
                ) : null}

                <div className="mt-4 rounded-lg border border-[#e3dbcd] bg-white p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#544d43]">
                    <Layers size={15} aria-hidden="true" />
                    Ficha tecnica (consumo por unidade)
                  </div>

                  {product.bom.length === 0 ? (
                    <p className="mt-2 text-xs text-[#9a9285]">Nenhum material vinculado. A baixa automática so ocorre com a ficha preenchida.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {product.bom.map((entry) => (
                        <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                          <span>{entry.material.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{entry.quantityPerUnit} {entry.material.unit}</span>
                            <form action={removeProductMaterialAction}>
                              <input type="hidden" name="id" value={entry.id} />
                              <button className="text-[#b23647]" title="Remover material da ficha" aria-label="Remover material da ficha">
                                <Trash2 size={13} aria-hidden="true" />
                              </button>
                            </form>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {materials.length > 0 ? (
                    <form action={setProductMaterialAction} className="mt-3 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="productId" value={product.id} />
                      <label className="min-w-32 flex-1">
                        <span className="text-xs text-[#766d5d]">Material</span>
                        <select name="materialId" required className="mt-1 h-9 w-full rounded-lg border border-[#d8cfbf] bg-white px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4">
                          {materials.map((material) => (
                            <option key={material.id} value={material.id}>{material.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="w-20">
                        <span className="text-xs text-[#766d5d]">Qtd/un</span>
                        <input name="quantityPerUnit" type="number" min="0" step="0.001" required className="mt-1 h-9 w-full rounded-lg border border-[#d8cfbf] px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4" placeholder="1,5" />
                      </label>
                      <button className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#1d1b16] px-3 text-xs font-semibold text-white">
                        <Plus size={14} aria-hidden="true" />
                        Vincular
                      </button>
                    </form>
                  ) : (
                    <p className="mt-2 text-xs text-[#9a9285]">Cadastre materiais no estoque para montar a ficha tecnica.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard eyebrow="Novo produto" title="Cadastrar peça">
        <ProductCreateForm />
      </SectionCard>
    </section>
  );
}
