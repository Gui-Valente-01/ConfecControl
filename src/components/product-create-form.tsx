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
  ["cost", "Outros custos por peça", "Ex.: R$ 70"],
  ["time", "Prazo médio", "Ex.: 8 dias"],
];

const kinds: [string, string, string][] = [
  ["PRODUCT", "Peça própria", "A confecção faz a peça inteira: material e serviços"],
  ["SERVICE", "Serviço na peça do cliente", "O cliente traz a peça e você só presta o serviço"],
];

export function ProductCreateForm() {
  const [state, formAction] = useActionState(createProductAction, emptyFormState);
  useActionFeedback(state);

  return (
    <form className="space-y-3" action={formAction}>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-[#405047]">Tipo</legend>
        {kinds.map(([value, label, hint]) => (
          <label
            key={value}
            className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#c7d3ce] bg-white px-3 py-2 transition hover:border-[#087f7d] has-checked:border-[#087f7d] has-checked:bg-[#f4fbfa]"
          >
            <input type="radio" name="kind" value={value} defaultChecked={value === "PRODUCT"} className="mt-0.5 size-4 accent-[#087f7d]" />
            <span>
              <span className="block text-sm font-medium text-[#1c2420]">{label}</span>
              <span className="block text-xs text-[#63736b]">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

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
