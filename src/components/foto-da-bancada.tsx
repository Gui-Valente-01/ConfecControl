"use client";

import { Camera } from "lucide-react";
import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { uploadFotoBancadaAction } from "@/app/bancada/actions";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

// Foto tirada pelo funcionário durante a produção.
//
// Antes ele avisava o problema por WhatsApp e aquilo sumia do pedido: quem
// fosse ver depois não achava mais. Agora a foto fica junto do pedido, com o
// nome de quem tirou.
//
// O campo tem capture="environment": no celular abre a câmera traseira direto,
// em vez da galeria. É o caminho mais curto para quem está de pé na oficina.

function BotaoEnviar() {
  const { pending } = useFormStatus();
  return (
    <span className="text-xs font-medium text-muted">
      {pending ? "Enviando foto..." : null}
    </span>
  );
}

export function FotoDaBancada({ taskId, numeroPedido }: { taskId: string; numeroPedido: number }) {
  const [state, formAction] = useActionState(uploadFotoBancadaAction, emptyFormState);
  useActionFeedback(state);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      {/* O <label> É o botão: o input de arquivo fica escondido porque o
          estilo nativo dele não dá para acertar, e no celular ele aparece
          minúsculo. */}
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-body transition hover:bg-canvas">
        <Camera size={16} aria-hidden="true" />
        Tirar foto
        <input
          type="file"
          name="foto"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label={`Tirar foto da produção do pedido ${numeroPedido}`}
          // Envia sozinho ao escolher: um segundo botão "enviar" seria mais um
          // toque para quem está de pé, com a mão suja.
          onChange={(e) => {
            if (e.target.files?.length) formRef.current?.requestSubmit();
          }}
        />
      </label>
      <BotaoEnviar />
    </form>
  );
}
