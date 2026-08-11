"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { createClientAction } from "@/app/clientes/actions";
import { SubmitButton } from "@/components/submit-button";
import { useActionFeedback } from "@/components/toast";
import { useFieldError } from "@/components/use-field-error";
import { emptyFormState } from "@/lib/form-state";

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-line-strong px-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4";

export function ClientCreateForm() {
  const [state, formAction] = useActionState(createClientAction, emptyFormState);
  useActionFeedback(state);
  const formRef = useFieldError(state);

  return (
    <form ref={formRef} className="space-y-3" action={formAction}>
      <label className="block">
        <span className="text-sm font-medium text-body">Empresa</span>
        <input className={fieldClass} name="name" placeholder="Ex.: Moda Sul" required />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-body">Contato</span>
        <input className={fieldClass} name="contact" placeholder="Nome da pessoa" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-body">WhatsApp</span>
        <input className={fieldClass} name="phone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-body">E-mail</span>
        <input className={fieldClass} name="email" type="email" placeholder="cliente@empresa.com" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-body">CPF/CNPJ</span>
        <input className={fieldClass} name="document" inputMode="numeric" placeholder="00.000.000/0001-00" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-body">Endereço</span>
        <input className={fieldClass} name="address" placeholder="Rua, número, cidade" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-body">Observações</span>
        <textarea className="mt-1 min-h-20 w-full rounded-lg border border-line-strong px-3 py-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4" name="notes" placeholder="Preferencias, histórico, etc." />
      </label>
      {state.error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger-dark">{state.error}</p> : null}
      <SubmitButton>
        <Plus size={17} aria-hidden="true" />
        Salvar cliente
      </SubmitButton>
    </form>
  );
}
