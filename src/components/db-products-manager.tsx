import { Boxes, Shirt } from "lucide-react";
import { deleteProductAction, updateProductAction } from "@/app/produtos/actions";
import { InlineEdit } from "@/components/inline-edit";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ProductCreateForm } from "@/components/product-create-form";
import { SectionCard } from "@/components/section-card";
import { ServicesManager } from "@/components/services-manager";
import { describeBlockedDeletion, describeDeletion } from "@/lib/deletion";
import { centsToCurrency, centsToInput } from "@/lib/format";

type DbProduct = {
  id: string;
  name: string;
  category: string | null;
  fabric: string | null;
  standardPriceInCents: number;
  costInCents: number;
  averageProductionDays: number | null;
  kind: "PRODUCT" | "SERVICE";
  currentQuantity: number;
  minimumQuantity: number;
  _count: { items: number; movements: number };
};

type ServiceOption = { id: string; name: string; defaultPriceInCents: number };

type DbProductsManagerProps = {
  products: DbProduct[];
  services: ServiceOption[];
  canEdit: boolean;
};

export function DbProductsManager({ products, services, canEdit }: DbProductsManagerProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <SectionCard
        eyebrow="Catálogo"
        title="Peças cadastradas"
        action={<div className="rounded-lg border border-[#d9e1dd] bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{products.length} peças</div>}
      >
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center">
            <Shirt className="mx-auto text-[#087f7d]" size={28} aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Nenhuma peça cadastrada</h3>
            <p className="mt-2 text-sm text-[#66756d]">Cadastre suas peças para usar nos pedidos.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {products.map((product) => {
              const lucro = product.standardPriceInCents - product.costInCents;
              // Mesma conta da tela de rentabilidade: lucro sobre a venda.
              const margem = product.standardPriceInCents > 0
                ? Math.round((lucro / product.standardPriceInCents) * 100)
                : 0;
              // Mínimo zero é "não guardo na prateleira": não vira alerta.
              const acabando = product.minimumQuantity > 0 && product.currentQuantity <= product.minimumQuantity;
              return (
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
                        { count: product._count.movements, singular: "movimento de estoque", plural: "movimentos de estoque" },
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

                {/* Custo e lucro da peça. O número que aparece aqui é o mesmo
                    que o relatório usa: um campo só, digitado por quem cadastra.
                    Antes esta caixa somava o material da ficha técnica e o
                    relatório não somava — a mesma peça mostrava dois lucros
                    diferentes, e a pessoa não tinha como saber qual valia. */}
                <div className="mt-4 rounded-lg border border-[#d9e1dd] bg-[#f8faf9] p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#405047]">
                    <Boxes size={15} aria-hidden="true" />
                    Estoque e margem
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-sm">
                    <span className="text-[#66756d]">Na prateleira</span>
                    <span className={`font-semibold tabular-nums ${acabando ? "text-[#9f2f42]" : ""}`}>
                      {product.currentQuantity} un.
                      {product.minimumQuantity > 0 ? (
                        <span className="ml-1 text-xs font-medium text-[#8a9890]">mín. {product.minimumQuantity}</span>
                      ) : null}
                    </span>
                  </div>

                  {product.costInCents === 0 ? (
                    <p className="mt-2.5 rounded bg-[#fff7dd] px-2 py-1 text-xs text-[#7b5a0b]">
                      Sem custo digitado: a venda desta peça entra no relatório como lucro cheio. Use &ldquo;Editar&rdquo; e preencha o custo por peça.
                    </p>
                  ) : (
                    <div className="mt-2.5 border-t border-[#d9e1dd] pt-2.5 text-sm">
                      <div className="flex items-center justify-between text-[#66756d]">
                        <span>Custo por peça</span>
                        <span className="tabular-nums">{centsToCurrency(product.costInCents)}</span>
                      </div>
                      {product.standardPriceInCents > 0 ? (
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[#66756d]">Lucro por peça</span>
                          <span className={`font-semibold tabular-nums ${lucro > 0 ? "text-[#05605e]" : "text-[#9f2f42]"}`}>
                            {centsToCurrency(lucro)} <span className="text-xs font-medium">({margem}%)</span>
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

              </article>
              );
            })}
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
