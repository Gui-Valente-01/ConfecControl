"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { createProductAction } from "@/app/produtos/actions";
import { SubmitButton } from "@/components/submit-button";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

const fields: [string, string, string][] = [
  ["name", "Nome", "Ex.: Moletom canguru"],
  ["category", "Categoria", "Ex.: Uniformes"],
  ["fabric", "Tecido", "Ex.: Moletom 3 cabos"],
  ["price", "Valor padrão", "Ex.: R$ 120"],
  ["cost", "Custo de produção", "Ex.: R$ 70"],
  ["time", "Prazo médio", "Ex.: 8 dias"],
];

export function ProductCreateForm() {
  const [state, formAction] = useActionState(createProductAction, emptyFormState);
  useActionFeedback(state);

  return (
    <form className="space-y-3" action={formAction}>
      {fields.map(([field, label, placeholder]) => (
        <label key={field} className="block">
          <span className="text-sm font-medium text-[#405047]">{label}</span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
            name={field}
            placeholder={placeholder}
            required={field === "name"}
          />
        </label>
      ))}
      {state.error ? <p className="rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">{state.error}</p> : null}
      <SubmitButton>
        <Plus size={17} aria-hidden="true" />
        Salvar peça
      </SubmitButton>
    </form>
  );
}
