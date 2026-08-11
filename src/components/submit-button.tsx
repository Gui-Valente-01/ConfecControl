"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

const defaultClass =
  "flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60";

type SubmitButtonProps = {
  children: ReactNode;
  pendingText?: string;
  className?: string;
};

// Botao de submit com estado de carregamento (useFormStatus).
export function SubmitButton({ children, pendingText = "Salvando...", className }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className ?? defaultClass}>
      {pending ? pendingText : children}
    </button>
  );
}
