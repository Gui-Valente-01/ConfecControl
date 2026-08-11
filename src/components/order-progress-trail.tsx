import Link from "next/link";
import { ArrowRight, Check, CircleDot, CircleSlash } from "lucide-react";
import { MARCOS, posicaoNoFluxo, proximaAcao, type PedidoParaAcao } from "@/lib/order-progress";
import type { OrderStatus } from "@prisma/client";

// Faixa de andamento do pedido, com a próxima ação em destaque.
//
// A etapa atual não é indicada só por cor: tem ícone (✓ feito, ● agora),
// a palavra "Agora" embaixo, e aria-current para o leitor de tela. Quem não
// distingue as cores continua sabendo onde o pedido está.

type OrderProgressTrailProps = {
  status: OrderStatus;
  totalAmountInCents: number;
  paidAmountInCents: number;
  /** Nome da etapa detalhada da produção (Corte, Silk...), quando existe. */
  etapaAtual?: string | null;
  podeAvancar: boolean;
};

export function OrderProgressTrail({
  status,
  totalAmountInCents,
  paidAmountInCents,
  etapaAtual,
  podeAvancar,
}: OrderProgressTrailProps) {
  const atual = posicaoNoFluxo(status);
  const pedido: PedidoParaAcao = { status, totalAmountInCents, paidAmountInCents };
  const acao = proximaAcao(pedido);
  const cancelado = atual === -1;

  const destino =
    acao.destino === "producao" ? "/producao" : acao.destino === "financeiro" ? "/financeiro" : null;

  return (
    <section
      aria-label="Andamento do pedido"
      className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5"
    >
      {cancelado ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-danger-dark">
          <CircleSlash size={18} aria-hidden="true" />
          Pedido cancelado — fora da produção.
        </p>
      ) : (
        <ol className="flex flex-wrap gap-x-1 gap-y-3">
          {MARCOS.map((marco, indice) => {
            const feito = indice < atual;
            const agora = indice === atual;
            return (
              <li key={marco.chave} className="flex min-w-0 flex-1 basis-28 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <span className={`h-0.5 flex-1 ${indice === 0 ? "bg-transparent" : feito || agora ? "bg-primary" : "bg-tint"}`} />
                  <span
                    aria-current={agora ? "step" : undefined}
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 ${
                      agora
                        ? "border-primary bg-primary text-white"
                        : feito
                          ? "border-primary bg-surface text-primary"
                          : "border-line bg-surface text-faint"
                    }`}
                  >
                    {feito ? (
                      <Check size={16} aria-hidden="true" />
                    ) : agora ? (
                      <CircleDot size={16} aria-hidden="true" />
                    ) : (
                      <span className="text-xs font-semibold">{indice + 1}</span>
                    )}
                  </span>
                  <span className={`h-0.5 flex-1 ${indice === MARCOS.length - 1 ? "bg-transparent" : feito ? "bg-primary" : "bg-tint"}`} />
                </div>
                <span className={`mt-1.5 px-1 text-xs leading-4 ${agora ? "font-semibold text-primary-dark" : feito ? "text-body" : "text-soft"}`}>
                  {marco.rotulo}
                </span>
                {/* Marcador em texto: não depender só da cor nem do ícone. */}
                {agora ? <span className="text-[10px] font-bold uppercase tracking-wide text-primary">Agora</span> : null}
              </li>
            );
          })}
        </ol>
      )}

      {etapaAtual && !cancelado ? (
        <p className="mt-3 text-center text-xs text-muted">
          Etapa detalhada na produção: <strong className="font-semibold text-body">{etapaAtual}</strong>
        </p>
      ) : null}

      {/* Próximo passo: uma ação só, a mais provável. */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-divider pt-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-soft">Próximo passo</p>
          <p className="mt-0.5 font-semibold text-fg">{acao.rotulo}</p>
          <p className="text-sm text-muted">{acao.explicacao}</p>
        </div>
        {destino && podeAvancar ? (
          <Link
            href={destino}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            {acao.destino === "financeiro" ? "Ir ao Financeiro" : "Ir à Produção"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
