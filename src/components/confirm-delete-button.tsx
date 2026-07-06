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
};

export function ConfirmDeleteButton({
  action,
  id,
  message = "Tem certeza que deseja excluir? Esta ação não pode ser desfeita.",
  title = "Excluir",
  variant = "icon",
  label = "Excluir",
}: ConfirmDeleteButtonProps) {
  const [state, formAction] = useActionState(action, emptyFormState);
  useActionFeedback(state);

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
