"use client";

import type { ReactNode } from "react";
import { useActionState, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useActionFeedback } from "@/components/toast";
import { useFieldError } from "@/components/use-field-error";
import { emptyFormState, type FormState } from "@/lib/form-state";

type ToastFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  /** Quando vem preenchido, pergunta antes de enviar. */
  confirm?: string;
  /** Texto do botão que confirma dentro da janela. */
  confirmLabel?: string;
};

// Form para server actions com FormState: o toast reflete o resultado real
// da action (sucesso ou erro), em vez de um aviso otimista.
export function ToastForm({ action, children, className, confirm, confirmLabel = "Confirmar" }: ToastFormProps) {
  const [state, formAction] = useActionState(action, emptyFormState);
  useActionFeedback(state);
  const formRef = useFieldError(state);
  const [perguntando, setPerguntando] = useState(false);
  // Guarda o envio até a pessoa responder, e libera depois de confirmar.
  const confirmado = useRef(false);

  // A primeira linha é a pergunta; o resto explica o que vai acontecer.
  const [pergunta, ...restante] = (confirm ?? "").split("\n");

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className={className}
        onSubmit={(event) => {
          if (!confirm) return;
          if (confirmado.current) {
            confirmado.current = false;
            return;
          }
          event.preventDefault();
          setPerguntando(true);
        }}
      >
        {children}
      </form>

      {confirm ? (
        <ConfirmDialog
          aberto={perguntando}
          titulo={pergunta}
          mensagem={restante.join("\n")}
          confirmarLabel={confirmLabel}
          onCancelar={() => setPerguntando(false)}
          onConfirmar={() => {
            setPerguntando(false);
            confirmado.current = true;
            formRef.current?.requestSubmit();
          }}
        />
      ) : null}
    </>
  );
}
