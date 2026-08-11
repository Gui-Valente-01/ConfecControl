"use client";

import { Pencil } from "lucide-react";
import { ToastForm } from "@/components/toast-form";
import type { FormState } from "@/lib/form-state";

export type EditField = {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
  required?: boolean;
};

type InlineEditProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  fields: EditField[];
};

// "Editar" expansivel, reutilizavel. Visivel apenas para quem pode editar (Dono).
export function InlineEdit({ action, id, fields }: InlineEditProps) {
  return (
    <details className="mt-3 text-sm">
      <summary className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-1 text-xs font-semibold text-primary transition hover:bg-primary-soft">
        <Pencil size={12} aria-hidden="true" />
        Editar
      </summary>
      <ToastForm action={action} className="mt-2 space-y-2 rounded-lg border border-line bg-canvas p-3">
        <input type="hidden" name="id" value={id} />
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="text-xs text-muted">{field.label}</span>
            {field.textarea ? (
              <textarea
                name={field.name}
                defaultValue={field.defaultValue}
                placeholder={field.placeholder}
                className="mt-1 min-h-16 w-full rounded-lg border border-line-strong px-2 py-1.5 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
              />
            ) : (
              <input
                name={field.name}
                type={field.type ?? "text"}
                defaultValue={field.defaultValue}
                placeholder={field.placeholder}
                required={field.required}
                className="mt-1 h-9 w-full rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
              />
            )}
          </label>
        ))}
        <button className="h-9 w-full rounded-lg bg-primary text-xs font-semibold text-white transition hover:bg-primary-dark">Salvar alterações</button>
      </ToastForm>
    </details>
  );
}
