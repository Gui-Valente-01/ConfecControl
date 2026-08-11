"use client";

import Link from "next/link";
import { CheckCircle2, ImagePlus, Send } from "lucide-react";
import { useActionState } from "react";
import { createRequestAction } from "@/app/portal/actions";
import { emptyFormState } from "@/lib/form-state";

type RequestFormProps = {
  referenceOrderId?: string;
  referenceLabel?: string;
};

const field =
  "mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-fg outline-none ring-primary/20 transition placeholder:text-muted focus:border-primary focus:ring-4";

export function RequestForm({ referenceOrderId, referenceLabel }: RequestFormProps) {
  const [state, formAction, pending] = useActionState(createRequestAction, emptyFormState);

  if (state.success) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary-soft p-6 text-center">
        <CheckCircle2 className="mx-auto text-primary-dark" size={30} aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-primary-dark">{state.success}</p>
        <Link href="/portal" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark">
          Voltar aos meus pedidos
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {referenceOrderId ? <input type="hidden" name="referenceOrderId" value={referenceOrderId} /> : null}

      {referenceLabel ? (
        <p className="rounded-lg bg-primary-soft px-3 py-2.5 text-sm text-primary-dark">
          Repetindo a peça do pedido <strong>{referenceLabel}</strong>. Diga a quantidade e ajuste o que precisar.
        </p>
      ) : null}

      <label className="block">
        <span className="text-sm font-medium text-body">O que você precisa?</span>
        <textarea
          name="description"
          required
          minLength={3}
          rows={4}
          className={field}
          placeholder="Ex.: 50 camisetas polo azul-marinho, tamanho M, com bordado do logo no peito."
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-body">Quantidade (opcional)</span>
        <input name="quantity" type="number" min="1" inputMode="numeric" className={field} placeholder="Ex.: 50" />
      </label>

      <label className="block">
        <span className="flex items-center gap-1.5 text-sm font-medium text-body">
          <ImagePlus size={16} aria-hidden="true" />
          Foto de referência (opcional)
        </span>
        <input
          name="photo"
          type="file"
          accept="image/*"
          className="mt-1.5 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        <span className="mt-1 block text-xs text-soft">Uma foto ajuda a confecção a entender o modelo (até 8 MB).</span>
      </label>

      {state.error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger-dark">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={16} aria-hidden="true" />
        {pending ? "Enviando..." : "Enviar solicitação"}
      </button>
    </form>
  );
}
