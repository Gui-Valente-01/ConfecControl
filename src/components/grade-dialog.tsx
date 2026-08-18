"use client";

import { useMemo, useState } from "react";
import { Grid3x3, Plus, X } from "lucide-react";
import {
  celulasPreenchidas,
  chaveCelula,
  separarLista,
  totalDaGrade,
  GRADES_SUGERIDAS,
} from "@/lib/grade";

type ProductOption = { id: string; name: string; standardPriceInCents: number };

/** Uma linha de pedido pronta para entrar no formulário. */
export type ItemDaGrade = {
  productId: string;
  description: string;
  size: string;
  color: string;
  quantity: string;
  unitPrice: string;
};

const campo =
  "mt-1 h-9 w-full rounded-lg border border-line-strong bg-surface px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4";

/**
 * Lança a mesma peça em vários tamanhos e cores de uma vez.
 *
 * A tela é uma tabela: tamanho nas colunas, cor nas linhas, quantidade em cada
 * cruzamento. É o mesmo desenho do papel que a escola manda — quem preenche
 * copia de cima para baixo, em vez de traduzir para doze linhas de formulário.
 *
 * Ao confirmar, cada quadradinho preenchido vira um item comum do pedido. Nada
 * de grade é guardado: o pedido continua sendo uma lista de itens, e por isso
 * estoque, impressão e relatórios não precisaram mudar.
 */
export function GradeDialog({
  products,
  onAdicionar,
  onFechar,
}: {
  products: ProductOption[];
  onAdicionar: (itens: ItemDaGrade[]) => void;
  onFechar: () => void;
}) {
  const [productId, setProductId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoUnitario, setPrecoUnitario] = useState("");
  const [textoTamanhos, setTextoTamanhos] = useState("");
  const [textoCores, setTextoCores] = useState("");
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});

  const tamanhos = useMemo(() => separarLista(textoTamanhos), [textoTamanhos]);
  const cores = useMemo(() => separarLista(textoCores), [textoCores]);
  // Sem cor digitada a grade tem uma faixa só, sem nome: é o caso de quem faz
  // uma cor por pedido e só precisa dos tamanhos.
  const faixas = cores.length > 0 ? cores : [""];

  const celulas = useMemo(
    () => celulasPreenchidas(cores, tamanhos, quantidades),
    [cores, tamanhos, quantidades],
  );
  const totalPecas = totalDaGrade(celulas);
  const precoEmCentavos = Math.max(
    0,
    Math.round((Number(precoUnitario.replace(",", ".")) || 0) * 100),
  );
  const totalEmCentavos = precoEmCentavos * totalPecas;

  const produto = products.find((p) => p.id === productId) ?? null;
  const nomeBase = descricao.trim() || produto?.name || "";
  const podeAdicionar = totalPecas > 0 && nomeBase.length > 0;

  function escolherProduto(id: string) {
    setProductId(id);
    const produtoEscolhido = products.find((p) => p.id === id);
    if (!produtoEscolhido) return;
    // Preenche o que ainda está em branco, sem sobrescrever o que a pessoa
    // digitou: quem já escreveu um preço combinou aquele preço.
    if (!descricao.trim()) setDescricao(produtoEscolhido.name);
    if (!precoUnitario.trim() && produtoEscolhido.standardPriceInCents > 0) {
      setPrecoUnitario((produtoEscolhido.standardPriceInCents / 100).toString());
    }
  }

  function confirmar() {
    if (!podeAdicionar) return;
    onAdicionar(
      celulas.map((celula) => ({
        productId,
        description: nomeBase,
        size: celula.tamanho,
        color: celula.cor,
        quantity: String(celula.quantidade),
        unitPrice: precoUnitario,
      })),
    );
  }

  return (
    <div className="rounded-lg border border-primary/40 bg-primary-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-primary-dark">
            <Grid3x3 size={16} aria-hidden="true" />
            Grade de tamanhos
          </p>
          <p className="mt-1 text-xs leading-relaxed text-body">
            Digite os tamanhos e, se precisar, as cores. Depois preencha as quantidades: cada
            quadradinho vira um item do pedido.
          </p>
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar a grade"
          className="rounded-lg p-1 text-muted transition hover:bg-surface hover:text-body"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-muted">Peça</span>
          <select value={productId} onChange={(e) => escolherProduto(e.target.value)} className={campo}>
            <option value="">Peça avulsa</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Descrição</span>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Camiseta do uniforme"
            className={campo}
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_140px]">
        <label className="block">
          <span className="text-xs font-medium text-muted">Tamanhos</span>
          <input
            value={textoTamanhos}
            onChange={(e) => setTextoTamanhos(e.target.value)}
            placeholder="P M G GG"
            className={campo}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Cores (opcional)</span>
          <input
            value={textoCores}
            onChange={(e) => setTextoCores(e.target.value)}
            placeholder="Azul Marinho, Branco"
            className={campo}
          />
          <span className="mt-1 block text-[11px] leading-tight text-soft">
            Separe por vírgula quando o nome tiver mais de uma palavra.
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Preço por peça</span>
          <input
            value={precoUnitario}
            onChange={(e) => setPrecoUnitario(e.target.value)}
            inputMode="decimal"
            placeholder="39.90"
            className={campo}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Atalhos:</span>
        {GRADES_SUGERIDAS.map((sugestao) => (
          <button
            key={sugestao.rotulo}
            type="button"
            onClick={() => setTextoTamanhos(sugestao.tamanhos)}
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-xs font-medium text-body transition hover:bg-tint"
          >
            {sugestao.rotulo}
          </button>
        ))}
      </div>

      {tamanhos.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-line-strong bg-surface p-4 text-center text-sm text-muted">
          Digite os tamanhos acima para a grade aparecer.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Cor
                </th>
                {tamanhos.map((tamanho) => (
                  <th key={tamanho} className="px-2 py-2 text-center text-xs font-semibold text-body">
                    {tamanho}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {faixas.map((cor) => {
                const totalDaLinha = tamanhos.reduce(
                  (soma, tamanho) => soma + (Number(quantidades[chaveCelula(cor, tamanho)]) || 0),
                  0,
                );
                return (
                  <tr key={cor || "(faixa unica)"} className="border-t border-divider">
                    <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-medium text-body">
                      {cor || <span className="text-soft">Única</span>}
                    </th>
                    {tamanhos.map((tamanho) => {
                      const chave = chaveCelula(cor, tamanho);
                      return (
                        <td key={tamanho} className="px-1 py-1.5">
                          <input
                            value={quantidades[chave] ?? ""}
                            onChange={(e) =>
                              setQuantidades((prev) => ({ ...prev, [chave]: e.target.value }))
                            }
                            inputMode="numeric"
                            placeholder="0"
                            aria-label={`Quantidade tamanho ${tamanho}${cor ? ` na cor ${cor}` : ""}`}
                            className="h-9 w-14 rounded-lg border border-line-strong bg-surface text-center text-sm tabular-nums outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-body">
                      {totalDaLinha > 0 ? totalDaLinha : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-body">
          <strong className="tabular-nums">{totalPecas}</strong> {totalPecas === 1 ? "peça" : "peças"}
          {precoEmCentavos > 0 ? (
            <span className="text-muted">
              {" · "}
              {(totalEmCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          ) : null}
          {celulas.length > 0 ? (
            <span className="text-muted">
              {" · "}
              {celulas.length === 1 ? "1 linha" : `${celulas.length} linhas`} no pedido
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onFechar}
            className="inline-flex h-10 items-center rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-body transition hover:bg-tint"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!podeAdicionar}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={15} aria-hidden="true" />
            Adicionar ao pedido
          </button>
        </div>
      </div>

      {totalPecas > 0 && nomeBase.length === 0 ? (
        <p className="mt-2 text-xs text-warning-ink">
          Escolha a peça ou escreva uma descrição antes de adicionar.
        </p>
      ) : null}
    </div>
  );
}
