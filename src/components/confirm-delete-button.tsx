"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState, type FormState } from "@/lib/form-state";

type ConfirmDeleteButtonProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  message?: string;
  title?: string;
  variant?: "icon" | "full";
  label?: string;
  /**
   * Motivo pelo qual esse cadastro não pode ser excluído agora (ex.: cliente
   * com pedido). Quando vem preenchido, o botão fica desligado e explica o
   * porquê, em vez de deixar a pessoa clicar, confirmar e tomar um erro.
   */
  blockedReason?: string | null;
};

export function ConfirmDeleteButton({
  action,
  id,
  message = "Tem certeza que deseja excluir? Esta ação não pode ser desfeita.",
  title = "Excluir",
  variant = "icon",
  label = "Excluir",
  blockedReason = null,
}: ConfirmDeleteButtonProps) {
  const [state, formAction] = useActionState(action, emptyFormState);
  useActionFeedback(state);

  if (blockedReason) {
    const base =
      variant === "icon"
        ? "inline-flex size-9 items-center justify-center rounded-lg border border-[#e6ebe8] bg-[#f4f7f5] text-[#a9b5ae]"
        : "inline-flex h-10 items-center gap-2 rounded-lg border border-[#e6ebe8] bg-[#f4f7f5] px-4 text-sm font-semibold text-[#a9b5ae]";
    return (
      <button type="button" disabled className={`${base} cursor-not-allowed`} title={blockedReason} aria-label={blockedReason}>
        <Trash2 size={variant === "icon" ? 16 : 16} aria-hidden="true" />
        {variant === "full" ? label : null}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {variant === "icon" ? (
        <button
          className="inline-flex size-9 items-center justify-center rounded-lg border border-[#d9e1dd] bg-white text-[#9f2f42] transition hover:border-[#f1c0c9] hover:bg-[#fff0f2]"
          title={title}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      ) : (
        <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9e1dd] bg-white px-4 text-sm font-semibold text-[#9f2f42] transition hover:border-[#f1c0c9] hover:bg-[#fff0f2]">
          <Trash2 size={16} aria-hidden="true" />
          {label}
        </button>
      )}
    </form>
  );
}
