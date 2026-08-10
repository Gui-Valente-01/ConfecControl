import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Package, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { registerStockMovementAction, setProductMinimumAction } from "@/app/estoque/actions";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { ToastForm } from "@/components/toast-form";
import { centsToCurrency, formatDateTime } from "@/lib/format";
import type { StockMovementType } from "@prisma/client";

// Estoque da PEÇA PRONTA.
//
// Quem usa isto é a confecção que compra a peça e presta serviço em cima dela
// (estampa, bordado). A pergunta que a tela responde é "quantos bonés brancos
// eu tenho na prateleira agora?" — não quanto tecido sobrou.

type Peca = {
  id: string;
  name: string;
  category: string | null;
  size: string | null;
  color: string | null;
  currentQuantity: number;
  minimumQuantity: number;
  costInCents: number;
};

type Movimento = {
  id: string;
  type: StockMovementType;
  quantity: number;
  note: string | null;
  createdAt: Date;
  produtoNome: string;
  orderNumber: number | null;
};

type Props = {
  pecas: Peca[];
  movimentos: Movimento[];
  canManage: boolean;
};

const rotuloMovimento: Record<StockMovementType, string> = {
  IN: "Entrada",
  OUT: "Saída",
  ADJUSTMENT: "Acerto",
};

/** Nome completo da peça: "Camisa Polo · M · Branca". */
function descrever(p: Peca) {
  return [p.name, p.size, p.color].filter(Boolean).join(" · ");
}

export function DbStockManager({ pecas, movimentos, canManage }: Props) {
  // Só entra no aviso quem tem mínimo definido: peça com mínimo 0 e estoque 0
  // não está "acabando", é peça que a confecção não guarda em prateleira.
  const acabando = pecas.filter((p) => p.minimumQuantity > 0 && p.currentQuantity <= p.minimumQuantity);
  const totalPecas = pecas.reduce((s, p) => s + p.currentQuantity, 0);
  const valorParado = pecas.reduce((s, p) => s + p.currentQuantity * p.costInCents, 0);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Resumo do estoque">
        <MetricCard
          label="Peças na prateleira"
          value={String(totalPecas)}
          note="somando todas as peças"
          icon={Package}
          tone="info"
        />
        <MetricCard
          label="Acabando"
          value={String(acabando.length)}
          note="chegaram no mínimo"
          icon={AlertTriangle}
          tone={acabando.length > 0 ? "danger" : "neutral"}
        />
        <MetricCard
          label="Valor parado"
          value={centsToCurrency(valorParado)}
          note="custo do que está guardado"
          icon={SlidersHorizontal}
          tone="primary"
        />
      </section>

      {acabando.length > 0 ? (
        <div className="rounded-lg border border-[#ead49c] bg-[#fff7dd] p-4">
          <p className="flex items-center gap-2 font-semibold text-[#7b5a0b]">
            <AlertTriangle size={18} aria-hidden="true" />
            {acabando.length === 1 ? "1 peça acabando" : `${acabando.length} peças acabando`}
          </p>
          <p className="mt-1 text-sm text-[#7b5a0b]">
            {acabando.map((p) => descrever(p)).join(" · ")} — compre antes de faltar no meio de um pedido.
          </p>
        </div>
      ) : null}

      <SectionCard
        eyebrow="Prateleira"
        title="Peças prontas"
        action={
          <Link
            href="/produtos"
            className="inline-flex h-10 items-center rounded-lg border border-[#c7d3ce] bg-white px-3 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]"
          >
            Cadastrar peça
          </Link>
        }
      >
        {pecas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center">
            <Package size={24} className="mx-auto text-[#8a9890]" aria-hidden="true" />
            <h3 className="mt-2 font-semibold">Nenhuma peça cadastrada</h3>
            <p className="mt-1 text-sm text-[#66756d]">
              O estoque acompanha as peças do seu catálogo. Cadastre uma peça em Produtos e ela aparece aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#d9e1dd] text-left text-[#63736b]">
                  <th className="py-2 pr-3 font-medium">Peça</th>
                  <th className="py-2 pr-3 font-medium">Tenho</th>
                  <th className="py-2 pr-3 font-medium">Avisar quando chegar em</th>
                  {canManage ? <th className="py-2 font-medium">Lançar</th> : null}
                </tr>
              </thead>
              <tbody>
                {pecas.map((p) => {
                  const baixa = p.minimumQuantity > 0 && p.currentQuantity <= p.minimumQuantity;
                  return (
                    <tr key={p.id} className="border-b border-[#eef2ef] last:border-0 align-top">
                      <td className="py-3 pr-3">
                        <span className="font-semibold text-[#1c2420]">{descrever(p)}</span>
                        {p.category ? <span className="block text-xs text-[#8a9890]">{p.category}</span> : null}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`text-lg font-bold tabular-nums ${baixa ? "text-[#9f2f42]" : "text-[#05605e]"}`}>
                          {p.currentQuantity}
                        </span>
                        {baixa ? <span className="ml-2 text-xs font-semibold text-[#9f2f42]">acabando</span> : null}
                      </td>
                      <td className="py-3 pr-3">
                        {canManage ? (
                          <ToastForm action={setProductMinimumAction} className="flex items-center gap-2">
                            <input type="hidden" name="productId" value={p.id} />
                            <input
                              type="number"
                              name="minimumQuantity"
                              min={0}
                              defaultValue={p.minimumQuantity}
                              aria-label={`Mínimo de ${descrever(p)}`}
                              className="h-10 w-24 rounded-lg border border-[#c7d3ce] px-2"
                            />
                            <button className="h-10 rounded-lg border border-[#c7d3ce] bg-white px-3 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]">
                              Salvar
                            </button>
                          </ToastForm>
                        ) : (
                          <span className="tabular-nums">{p.minimumQuantity}</span>
                        )}
                      </td>
                      {canManage ? (
                        <td className="py-3">
                          <ToastForm action={registerStockMovementAction} className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="productId" value={p.id} />
                            <select
                              name="type"
                              aria-label={`Tipo de movimento de ${descrever(p)}`}
                              className="h-10 rounded-lg border border-[#c7d3ce] px-2"
                            >
                              <option value="IN">Chegou</option>
                              <option value="OUT">Saiu</option>
                              <option value="ADJUSTMENT">Contei e tenho</option>
                            </select>
                            <input
                              type="number"
                              name="quantity"
                              min={0}
                              placeholder="qtd"
                              required
                              aria-label={`Quantidade de ${descrever(p)}`}
                              className="h-10 w-24 rounded-lg border border-[#c7d3ce] px-2"
                            />
                            <button className="h-10 rounded-lg bg-[#087f7d] px-3 text-sm font-semibold text-white transition hover:bg-[#05605e]">
                              Lançar
                            </button>
                          </ToastForm>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard eyebrow="Histórico" title="Últimas movimentações">
        {movimentos.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#66756d]">
            Nenhuma movimentação ainda. Ao lançar um pedido, a peça sai daqui sozinha.
          </p>
        ) : (
          <ul className="divide-y divide-[#eef2ef]">
            {movimentos.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    m.type === "IN" ? "bg-[#e8f6f3] text-[#05605e]" : "bg-[#fff0f2] text-[#9f2f42]"
                  }`}
                >
                  {m.type === "IN" ? (
                    <ArrowUpCircle size={17} aria-hidden="true" />
                  ) : (
                    <ArrowDownCircle size={17} aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1c2420]">
                    {rotuloMovimento[m.type]} · {m.quantity} un. · {m.produtoNome}
                  </p>
                  <p className="mt-0.5 text-xs text-[#8a9890]">
                    {formatDateTime(m.createdAt)}
                    {m.orderNumber ? ` · pedido #${m.orderNumber}` : ""}
                    {m.note ? ` · ${m.note}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
