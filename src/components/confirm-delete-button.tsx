"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
  const [perguntando, setPerguntando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (blockedReason) {
    const base =
      variant === "icon"
        ? "inline-flex size-9 items-center justify-center rounded-lg border border-line bg-canvas text-faint"
        : "inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-canvas px-4 text-sm font-semibold text-faint";
    return (
      <button type="button" disabled className={`${base} cursor-not-allowed`} title={blockedReason} aria-label={blockedReason}>
        <Trash2 size={variant === "icon" ? 16 : 16} aria-hidden="true" />
        {variant === "full" ? label : null}
      </button>
    );
  }

  // A primeira linha da mensagem é a pergunta; o resto explica o que some.
  const [pergunta, ...restante] = message.split("\n");

  return (
    <>
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="id" value={id} />
        {/* type="button": quem envia é o botão de dentro da janela, depois de
            confirmar. Sem isto, o Enter no formulário apagaria sem perguntar. */}
        {variant === "icon" ? (
          <button
            type="button"
            onClick={() => setPerguntando(true)}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-danger-dark transition hover:border-danger-line hover:bg-danger-soft"
            title={title}
            aria-label={title}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPerguntando(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-danger-dark transition hover:border-danger-line hover:bg-danger-soft"
          >
            <Trash2 size={16} aria-hidden="true" />
            {label}
          </button>
        )}
      </form>

      <ConfirmDialog
        aberto={perguntando}
        titulo={pergunta || title}
        mensagem={restante.join("\n")}
        confirmarLabel={label}
        onCancelar={() => setPerguntando(false)}
        onConfirmar={() => {
          setPerguntando(false);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
