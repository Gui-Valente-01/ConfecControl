"use client";

import Link from "next/link";
import { ArrowRight, Check, Rocket, X } from "lucide-react";
import { useState } from "react";
import {
  deveMostrar,
  montarPassos,
  proximoPasso,
  quantosFeitos,
  rotuloProgresso,
  type ContagensIniciais,
} from "@/lib/primeiros-passos";

// Lista de primeiros passos, no topo do Início.
//
// Empresa recém-criada abre num painel vazio e não sabe se o sistema está
// funcionando ou se ela é que não achou onde mexer. Aqui vai a ordem.
//
// Cada passo marca sozinho quando o dado aparece: não há "concluir" para
// clicar, porque o que vale é o cadastro existir. E a lista some sozinha
// quando os cinco estão feitos — quem já usa há meses não precisa ver isso.

const CHAVE = "confec-primeiros-passos-escondido";

export function PrimeirosPassos({ contagens }: { contagens: ContagensIniciais }) {
  // Guardado no navegador de propósito: é preferência de tela, não dado da
  // empresa. Não vale uma coluna no banco nem uma migration.
  const [escondido, setEscondido] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(CHAVE) === "1";
  });

  const passos = montarPassos(contagens);
  if (!deveMostrar(passos, escondido)) return null;

  const proximo = proximoPasso(passos);
  const feitos = quantosFeitos(passos);

  const esconder = () => {
    window.localStorage.setItem(CHAVE, "1");
    setEscondido(true);
  };

  return (
    <section aria-labelledby="passos-titulo" className="rounded-xl border border-primary/30 bg-primary-soft p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-dark">
            <Rocket size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="passos-titulo" className="font-semibold text-fg">
              Primeiros passos
            </h2>
            <p className="mt-0.5 text-sm text-primary-dark">
              {proximo ? `Comece por: ${proximo.titulo.toLowerCase()}.` : "Tudo pronto."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={esconder}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-primary-dark transition hover:bg-primary-soft"
          title="Esconder os primeiros passos"
          aria-label="Esconder os primeiros passos"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Progresso em número e em barra: quem não distingue a cor lê o texto. */}
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary-soft">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(feitos / passos.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary-dark">{rotuloProgresso(passos)}</span>
      </div>

      <ol className="mt-4 space-y-1.5">
        {passos.map((passo, indice) => (
          <li key={passo.chave}>
            <Link
              href={passo.href}
              className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 transition ${
                passo.feito
                  ? "border-transparent bg-transparent"
                  : "border-primary/30 bg-surface hover:border-primary"
              }`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  passo.feito ? "bg-primary text-white" : "border border-primary/30 bg-surface text-primary-dark"
                }`}
              >
                {passo.feito ? <Check size={13} aria-hidden="true" /> : indice + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${passo.feito ? "text-soft line-through" : "text-fg"}`}>
                  {passo.titulo}
                </span>
                {!passo.feito ? (
                  <span className="block text-xs leading-5 text-muted">{passo.porque}</span>
                ) : null}
              </span>
              {passo.feito ? (
                <span className="shrink-0 text-xs font-semibold text-primary-dark">feito</span>
              ) : (
                <ArrowRight size={15} className="shrink-0 text-soft" aria-hidden="true" />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
