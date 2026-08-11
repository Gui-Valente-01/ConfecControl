"use client";

import { Camera, HandHelping, MessageSquare, Palette, Send, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { criarChamadoAction } from "@/app/avisos/actions";
import { useActionFeedback } from "@/components/toast";
import { descreverTipo, urgenciaPadrao, type TipoAviso } from "@/lib/avisos";
import { emptyFormState } from "@/lib/form-state";

// Chamados da bancada: pedir cor, pedir foto, pedir ajuda, deixar recado.
//
// Isto hoje acontece no grupo do WhatsApp e some: alguém pergunta "qual a cor
// do 1042?", respondem três horas depois, e nada fica no pedido. Quem chegar
// amanhã não encontra.
//
// Os três primeiros nascem urgentes porque quem pede está PARADO esperando a
// resposta. Recado não urge: é informação, não bloqueio.

const BOTOES: { tipo: TipoAviso; icone: typeof Palette }[] = [
  { tipo: "PEDE_COR", icone: Palette },
  { tipo: "PEDE_FOTO", icone: Camera },
  { tipo: "PEDE_AJUDA", icone: HandHelping },
  { tipo: "OBSERVACAO", icone: MessageSquare },
];

export function ChamadoBancada({ orderId, numeroPedido }: { orderId: string; numeroPedido: number }) {
  const [state, formAction] = useActionState(criarChamadoAction, emptyFormState);
  useActionFeedback(state);
  const [aberto, setAberto] = useState<TipoAviso | null>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  // Fecha o formulário quando o envio deu certo, para a pessoa ver que foi.
  const [ultimoSucesso, setUltimoSucesso] = useState(state.success);
  if (state.success && state.success !== ultimoSucesso) {
    setUltimoSucesso(state.success);
    if (aberto) setAberto(null);
  }

  // Cursor direto no campo: quem tocou em "pedir cor" quer escrever agora.
  useEffect(() => {
    if (aberto) campoRef.current?.focus();
  }, [aberto]);

  return (
    <div className="mt-2 border-t border-divider pt-2">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-soft">
        Precisa de algo?
      </p>

      <div className="flex flex-wrap gap-1.5">
        {BOTOES.map(({ tipo, icone: Icone }) => {
          const desc = descreverTipo(tipo);
          const ativo = aberto === tipo;
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => setAberto(ativo ? null : tipo)}
              aria-expanded={ativo}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-semibold transition ${
                ativo
                  ? "border-primary bg-primary-soft text-primary-dark"
                  : "border-line-strong bg-surface text-body hover:bg-canvas"
              }`}
            >
              <Icone size={15} aria-hidden="true" />
              {desc.acao}
            </button>
          );
        })}
      </div>

      {aberto ? (
        <form action={formAction} className="mt-2 rounded-lg border border-line-strong bg-canvas p-2.5">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="tipo" value={aberto} />

          <label className="block">
            <span className="text-xs font-medium text-body">
              {descreverTipo(aberto).rotulo} — pedido #{numeroPedido}
            </span>
            <textarea
              ref={campoRef}
              name="mensagem"
              rows={2}
              placeholder={descreverTipo(aberto).padrao}
              className="mt-1 w-full rounded-lg border border-line-strong px-2.5 py-2 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:text-sm"
            />
          </label>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {/* Pedido de ajuda já nasce urgente: a marca aparece travada, para
                a pessoa saber que vai chegar como urgente de qualquer jeito. */}
            {urgenciaPadrao(aberto) ? (
              <span className="text-xs font-semibold text-danger-dark">Vai como urgente</span>
            ) : (
              <label className="flex items-center gap-1.5 text-xs font-medium text-body">
                <input type="checkbox" name="urgente" className="size-4" />
                Marcar como urgente
              </label>
            )}

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setAberto(null)}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold text-muted"
              >
                <X size={14} aria-hidden="true" />
                Cancelar
              </button>
              <button className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-dark">
                <Send size={14} aria-hidden="true" />
                Enviar
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}
