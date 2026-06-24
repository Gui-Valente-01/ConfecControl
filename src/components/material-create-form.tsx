"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { createMaterialAction } from "@/app/estoque/actions";
import { SubmitButton } from "@/components/submit-button";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

const fields: [string, string, string][] = [
  ["name", "Material", "Ex.: Ziper invisivel"],
  ["category", "Categoria", "Ex.: Aviamento"],
  ["unit", "Unidade", "Ex.: unidades"],
  ["current", "Quantidade atual", "120"],
  ["min", "Estoque mínimo", "300"],
  ["supplier", "Fornecedor", "Ex.: Aviamentos SP"],
];

export function MaterialCreateForm() {
  const [state, formAction] = useActionState(createMaterialAction, emptyFormState);
  useActionFeedback(state);

  return (
    <form className="space-y-3" action={formAction}>
      {fields.map(([field, label, placeholder]) => (
        <label key={field} className="block">
          <span className="text-sm font-medium text-[#544d43]">{label}</span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-[#d8cfbf] px-3 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4"
            name={field}
            placeholder={placeholder}
            required={field === "name"}
          />
        </label>
      ))}
      {state.error ? <p className="rounded-lg bg-[#fdecef] px-3 py-2 text-sm font-medium text-[#b23647]">{state.error}</p> : null}
      <SubmitButton>
        <Plus size={17} aria-hidden="true" />
        Salvar material
      </SubmitButton>
    </form>
  );
}
