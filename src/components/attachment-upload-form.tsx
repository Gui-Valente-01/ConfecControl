"use client";

import { ACCEPT_DO_FORMULARIO } from "@/lib/upload-validation";
import { Upload } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { uploadAttachmentAction } from "@/app/pedidos/actions";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-body transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Upload size={16} aria-hidden="true" />
      {pending ? "Enviando..." : "Enviar"}
    </button>
  );
}

// Form de anexo com useActionState: o toast reflete o resultado real da action
// (sucesso ou erro), em vez do aviso otimista do ToastForm.
export function AttachmentUploadForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState(uploadAttachmentAction, emptyFormState);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input
        type="file"
      accept={ACCEPT_DO_FORMULARIO}
        name="file"
        required
        className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
      <UploadButton />
    </form>
  );
}
