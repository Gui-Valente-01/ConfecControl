"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { useActionFeedback } from "@/components/toast";
import { useFieldError } from "@/components/use-field-error";
import { emptyFormState, type FormState } from "@/lib/form-state";

type ToastFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  confirm?: string;
};

// Form para server actions com FormState: o toast reflete o resultado real
// da action (sucesso ou erro), em vez de um aviso otimista.
export function ToastForm({ action, children, className, confirm }: ToastFormProps) {
  const [state, formAction] = useActionState(action, emptyFormState);
  useActionFeedback(state);
  const formRef = useFieldError(state);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
