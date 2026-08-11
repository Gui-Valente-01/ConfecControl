"use client";

import { useActionState } from "react";
import { updateCompanyAction } from "@/app/configuracoes/actions";
import { SubmitButton } from "@/components/submit-button";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

type CompanySettingsFormProps = {
  company: {
    name: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
};

export function CompanySettingsForm({ company }: CompanySettingsFormProps) {
  const [state, formAction] = useActionState(updateCompanyAction, emptyFormState);
  useActionFeedback(state);

  const fields: [string, string, string][] = [
    ["name", "Nome da empresa", company.name || "Confecção Modelo"],
    ["document", "CNPJ", company.document || "00.000.000/0001-00"],
    ["phone", "WhatsApp", company.phone || "(11) 99999-9999"],
    ["email", "E-mail", company.email || "admin@confeccontrol.local"],
    ["address", "Endereço", company.address || "Rua das Costureiras, 120"],
  ];

  return (
    <form className="space-y-3" action={formAction}>
      {fields.map(([name, label, defaultValue]) => (
        <label key={name} className="block">
          <span className="text-sm font-medium text-body">{label}</span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-line-strong px-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
            name={name}
            defaultValue={defaultValue}
            required={name === "name"}
          />
        </label>
      ))}
      {state.error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger-dark">{state.error}</p> : null}
      <SubmitButton className="flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60">
        Salvar dados
      </SubmitButton>
    </form>
  );
}
