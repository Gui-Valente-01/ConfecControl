"use client";

import { Check, ChevronDown, Copy, Hash } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { montarConvite } from "@/lib/convite";

type ConviteDeAtivacaoProps = {
  code: string;
  clientName: string | null;
  contactEmail: string | null;
  expiresAt: Date | null;
};

// O endereço do site só existe no navegador e não muda enquanto a página vive.
// useSyncExternalStore lê esse valor sem efeito e sem divergir do que o servidor
// renderizou. Mesmo padrão de client-portal-invite.tsx.
const subscribeToNothing = () => () => {};
const readOrigin = () => window.location.origin;
const readOriginOnServer = () => "";

export function ConviteDeAtivacao({ code, clientName, contactEmail, expiresAt }: ConviteDeAtivacaoProps) {
  const [copiado, setCopiado] = useState<"convite" | "codigo" | null>(null);
  const origin = useSyncExternalStore(subscribeToNothing, readOrigin, readOriginOnServer);

  // No servidor a origem é vazia; a mensagem só fica completa depois da
  // hidratação. Renderizar assim mesmo evita divergência de HTML.
  const mensagem = montarConvite({ code, clientName, contactEmail, expiresAt, origin });

  async function copiar(texto: string, qual: "convite" | "codigo") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Clipboard indisponível (http sem localhost, permissão negada). O texto
      // continua visível e selecionável no campo abaixo.
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copiar(mensagem, "convite")}
          disabled={!origin}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
        >
          {copiado === "convite" ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          {copiado === "convite" ? "Convite copiado" : "Copiar convite"}
        </button>

        <button
          type="button"
          onClick={() => copiar(code, "codigo")}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-xs font-semibold text-body transition hover:bg-tint"
        >
          {copiado === "codigo" ? <Check size={13} aria-hidden="true" /> : <Hash size={13} aria-hidden="true" />}
          {copiado === "codigo" ? "Código copiado" : "Só o código"}
        </button>
      </div>

      <details className="rounded-lg border border-line bg-surface">
        <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted">
          <ChevronDown size={13} aria-hidden="true" />
          Ver a mensagem antes de enviar
        </summary>
        {/* Campo real, e não só texto: se a área de transferência falhar, dá
            para selecionar e copiar à mão sem perder o convite. */}
        <textarea
          readOnly
          value={mensagem}
          rows={9}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full resize-none border-t border-line bg-canvas px-3 py-2 font-mono text-[11px] leading-relaxed text-body outline-none"
        />
      </details>
    </div>
  );
}
