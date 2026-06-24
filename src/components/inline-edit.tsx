"use client";

import { Pencil } from "lucide-react";
import { ToastForm } from "@/components/toast-form";

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
  action: (formData: FormData) => void;
  id: string;
  fields: EditField[];
  message?: string;
};

// "Editar" expansivel, reutilizavel. Visivel apenas para quem pode editar (Dono).
export function InlineEdit({ action, id, fields, message = "Alteracoes salvas." }: InlineEditProps) {
  return (
    <details className="mt-3 text-sm">
      <summary className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#0f8b8d]">
        <Pencil size={12} aria-hidden="true" />
        Editar
      </summary>
      <ToastForm action={action} message={message} className="mt-2 space-y-2">
        <input type="hidden" name="id" value={id} />
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="text-xs text-[#766d5d]">{field.label}</span>
            {field.textarea ? (
              <textarea
                name={field.name}
                defaultValue={field.defaultValue}
                placeholder={field.placeholder}
                className="mt-1 min-h-16 w-full rounded-lg border border-[#d8cfbf] px-2 py-1.5 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4"
              />
            ) : (
              <input
                name={field.name}
                type={field.type ?? "text"}
                defaultValue={field.defaultValue}
                placeholder={field.placeholder}
                required={field.required}
                className="mt-1 h-9 w-full rounded-lg border border-[#d8cfbf] px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4"
              />
            )}
          </label>
        ))}
        <button className="h-9 w-full rounded-lg bg-[#1d1b16] text-xs font-semibold text-white">Salvar alterações</button>
      </ToastForm>
    </details>
  );
}
