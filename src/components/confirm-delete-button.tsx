"use client";

import { Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";

type ConfirmDeleteButtonProps = {
  action: (formData: FormData) => void;
  id: string;
  message?: string;
  title?: string;
  variant?: "icon" | "full";
  label?: string;
  toastMessage?: string;
};

export function ConfirmDeleteButton({
  action,
  id,
  message = "Tem certeza que deseja excluir? Esta acao não pode ser desfeita.",
  title = "Excluir",
  variant = "icon",
  label = "Excluir",
  toastMessage = "Item removido.",
}: ConfirmDeleteButtonProps) {
  const { toast } = useToast();
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        toast("success", toastMessage);
      }}
    >
      <input type="hidden" name="id" value={id} />
      {variant === "icon" ? (
        <button
          className="inline-flex size-9 items-center justify-center rounded-lg border border-[#d8cfbf] text-[#b23647] transition hover:bg-[#fdecef]"
          title={title}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      ) : (
        <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d8cfbf] px-4 text-sm font-semibold text-[#b23647] transition hover:bg-[#fdecef]">
          <Trash2 size={16} aria-hidden="true" />
          {label}
        </button>
      )}
    </form>
  );
}
