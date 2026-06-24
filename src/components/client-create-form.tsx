"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { createClientAction } from "@/app/clientes/actions";
import { SubmitButton } from "@/components/submit-button";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-[#d8cfbf] px-3 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4";

export function ClientCreateForm() {
  const [state, formAction] = useActionState(createClientAction, emptyFormState);
  useActionFeedback(state);

  return (
    <form className="space-y-3" action={formAction}>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">Empresa</span>
        <input className={fieldClass} name="name" placeholder="Ex.: Moda Sul" required />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">Contato</span>
        <input className={fieldClass} name="contact" placeholder="Nome da pessoa" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">WhatsApp</span>
        <input className={fieldClass} name="phone" placeholder="(11) 99999-9999" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">E-mail</span>
        <input className={fieldClass} name="email" type="email" placeholder="cliente@empresa.com" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">CPF/CNPJ</span>
        <input className={fieldClass} name="document" placeholder="00.000.000/0001-00" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">Endereço</span>
        <input className={fieldClass} name="address" placeholder="Rua, número, cidade" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">Observações</span>
        <textarea className="mt-1 min-h-20 w-full rounded-lg border border-[#d8cfbf] px-3 py-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4" name="notes" placeholder="Preferencias, histórico, etc." />
      </label>
      {state.error ? <p className="rounded-lg bg-[#fdecef] px-3 py-2 text-sm font-medium text-[#b23647]">{state.error}</p> : null}
      <SubmitButton>
        <Plus size={17} aria-hidden="true" />
        Salvar cliente
      </SubmitButton>
    </form>
  );
}
