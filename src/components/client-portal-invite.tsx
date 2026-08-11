"use client";

import { Check, Copy, LinkIcon, Send } from "lucide-react";
import { useActionState, useState, useSyncExternalStore } from "react";
import { generateClientInviteAction } from "@/app/clientes/actions";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

type ClientPortalInviteProps = {
  clientId: string;
  hasEmail: boolean;
  portalEnabled: boolean;
  inviteToken: string | null;
};

// O endereço do site só existe no navegador, e nunca muda enquanto a página vive.
// useSyncExternalStore lê esse valor sem efeito e sem divergir do que o servidor
// renderizou: no servidor o retorno é vazio, no cliente é o endereço real.
const subscribeToNothing = () => () => {};
const readOrigin = () => window.location.origin;
const readOriginOnServer = () => "";

export function ClientPortalInvite({ clientId, hasEmail, portalEnabled, inviteToken }: ClientPortalInviteProps) {
  const [state, formAction, pending] = useActionState(generateClientInviteAction, emptyFormState);
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(subscribeToNothing, readOrigin, readOriginOnServer);
  useActionFeedback(state);

  const link = inviteToken ? `${origin}/portal/entrar?t=${inviteToken}` : "";

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível: o usuário copia manualmente do campo
    }
  }

  return (
    <details className="mt-3 rounded-lg border border-line bg-canvas p-3">
      <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary">
        <LinkIcon size={13} aria-hidden="true" />
        Portal do cliente
      </summary>

      <div className="mt-3 space-y-2">
        {!hasEmail ? (
          <p className="text-xs text-danger-dark">Adicione um e-mail a este cliente (em Editar) para liberar o acesso ao portal.</p>
        ) : (
          <>
            <p className="text-xs text-muted">
              {portalEnabled && !inviteToken
                ? "Este cliente já ativou o portal. Gere um novo link só se ele precisar redefinir a senha."
                : "Gere um link e envie ao cliente (WhatsApp, e-mail). No 1º acesso ele cria a senha."}
            </p>

            {inviteToken ? (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={link}
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-9 w-full rounded-lg border border-line-strong bg-surface px-2 text-xs text-body outline-none"
                />
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 text-xs font-semibold text-body transition hover:bg-tint"
                >
                  {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            ) : null}

            <form action={formAction}>
              <input type="hidden" name="id" value={clientId} />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
              >
                <Send size={13} aria-hidden="true" />
                {pending ? "Gerando..." : inviteToken ? "Gerar novo link" : "Gerar link de acesso"}
              </button>
            </form>
          </>
        )}
      </div>
    </details>
  );
}
