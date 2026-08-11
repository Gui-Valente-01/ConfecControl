"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

// Confirmação dentro do sistema, no lugar do aviso do navegador.
//
// O window.confirm tem três problemas para quem está aprendendo a usar: a
// janela é do navegador e não parece parte do sistema, o texto sai todo
// espremido numa linha só, e o botão que apaga fica com o mesmo peso do que
// cancela — quem lê rápido clica em "OK" por reflexo.
//
// Aqui a janela é do sistema, o que vai acontecer aparece em lista, e a ação
// destrutiva é a que exige a leitura.
//
// Usa o <dialog> nativo de propósito: ele já prende o foco enquanto está
// aberto, fecha no Esc e devolve o foco ao botão que abriu. Fazer isso à mão
// costuma sair errado, e errado aqui significa quem usa teclado ou leitor de
// tela ficar preso atrás da janela.

type ConfirmDialogProps = {
  aberto: boolean;
  titulo: string;
  /** Frase principal. Linhas começando com "•" viram lista. */
  mensagem: string;
  /** Texto do botão que confirma. Verbo, para dizer o que vai acontecer. */
  confirmarLabel: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  /** Conteúdo extra abaixo da mensagem (ex.: campo de motivo). */
  children?: ReactNode;
};

export function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  confirmarLabel,
  onConfirmar,
  onCancelar,
  children,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  // O Esc do navegador fecha o <dialog> sem passar pelo React: sem isto, o
  // estado ficaria dizendo "aberto" com a janela já fechada, e o botão não
  // abriria mais.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const aoFechar = () => onCancelar();
    dialog.addEventListener("close", aoFechar);
    return () => dialog.removeEventListener("close", aoFechar);
  }, [onCancelar]);

  // Separa a frase das linhas de lista, para o que some junto virar itens.
  const linhas = mensagem.split("\n").map((l) => l.trim()).filter(Boolean);
  const itens = linhas.filter((l) => l.startsWith("•")).map((l) => l.slice(1).trim());
  const paragrafos = linhas.filter((l) => !l.startsWith("•"));

  // O bg-surface do <dialog> e explicito de proposito: sem ele o navegador
  // aplica o proprio branco, e no tema escuro o texto claro sumiria dentro.
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirmar-titulo"
      className="m-auto w-[min(92vw,30rem)] rounded-xl border border-line bg-surface p-0 text-fg shadow-[0_24px_60px_rgba(17,26,22,0.22)] backdrop:bg-ink/45"
      onClick={(event) => {
        // Clique fora da caixa fecha, como a pessoa espera de uma janela.
        if (event.target === ref.current) onCancelar();
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger-dark">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirmar-titulo" className="text-lg font-semibold">
              {titulo}
            </h2>
            {paragrafos.map((p) => (
              <p key={p} className="mt-1.5 text-sm leading-6 text-muted">
                {p}
              </p>
            ))}
          </div>
        </div>

        {itens.length > 0 ? (
          <ul className="mt-3 space-y-1.5 rounded-lg bg-danger-soft p-3 text-sm text-danger-dark">
            {itens.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {children}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* Cancelar tem menos peso visual, mas continua fácil de acertar. */}
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-body transition hover:bg-canvas"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger-dark"
          >
            {confirmarLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
