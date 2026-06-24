"use client";

import type { ReactNode } from "react";
import { useToast } from "@/components/toast";

type ToastFormProps = {
  action: (formData: FormData) => void;
  children: ReactNode;
  className?: string;
  message: string;
  kind?: "success" | "error" | "info";
  confirm?: string;
};

// Form para server actions sem retorno: dispara um toast otimista ao enviar.
export function ToastForm({ action, children, className, message, kind = "success", confirm }: ToastFormProps) {
  const { toast } = useToast();
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) {
          event.preventDefault();
          return;
        }
        toast(kind, message);
      }}
    >
      {children}
    </form>
  );
}
