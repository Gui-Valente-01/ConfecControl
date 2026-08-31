"use client";

import { FileText, RotateCcw, XCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cancelarNotaAction, consultarNotaAction, emitirNotaAction } from "@/app/fiscal/actions";
import { CampoIdempotencia } from "@/components/campo-idempotencia";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

// Os botões da nota fiscal ficam separados do painel porque precisam de estado
// no navegador (o resultado da action vira aviso na tela), e o painel é
// componente de servidor.

function Botao({
  rotulo,
  rotuloOcupado,
  icone,
  className,
}: {
  rotulo: string;
  rotuloOcupado: string;
  icone: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-progress disabled:opacity-70 ${className}`}
    >
      {icone}
      {pending ? rotuloOcupado : rotulo}
    </button>
  );
}

export function BotaoEmitir({ orderId, homologacao }: { orderId: string; homologacao: boolean }) {
  const [state, formAction] = useActionState(emitirNotaAction, emptyFormState);
  useActionFeedback(state);

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      {/* Sem isto o duplo clique vira duas notas — e nota duplicada se resolve
          com cancelamento na SEFAZ, não com um delete no banco. */}
      <CampoIdempotencia />
      <Botao
        rotulo={homologacao ? "Emitir em homologação" : "Emitir nota fiscal"}
        rotuloOcupado="Emitindo..."
        icone={<FileText size={15} aria-hidden="true" />}
        className="bg-primary text-white hover:bg-primary-dark"
      />
    </form>
  );
}

export function BotaoConsultar({ documentId }: { documentId: string }) {
  const [state, formAction] = useActionState(consultarNotaAction, emptyFormState);
  useActionFeedback(state);

  return (
    <form action={formAction}>
      <input type="hidden" name="documentId" value={documentId} />
      <Botao
        rotulo="Consultar situação"
        rotuloOcupado="Consultando..."
        icone={<RotateCcw size={15} aria-hidden="true" />}
        className="border border-line-strong bg-surface text-body hover:bg-tint"
      />
    </form>
  );
}

export function FormularioCancelamento({ documentId }: { documentId: string }) {
  const [state, formAction] = useActionState(cancelarNotaAction, emptyFormState);
  useActionFeedback(state);

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="documentId" value={documentId} />
      <label className="block">
        <span className="text-xs font-medium text-muted">
          Justificativa (mínimo 15 caracteres, exigência da SEFAZ)
        </span>
        <textarea
          name="justificativa"
          required
          minLength={15}
          rows={2}
          placeholder="Ex.: pedido cancelado pelo cliente antes da entrega"
          className="mt-1 w-full rounded-lg border border-line-strong bg-surface p-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
        />
      </label>
      <div className="mt-2">
        <Botao
          rotulo="Cancelar nota"
          rotuloOcupado="Cancelando..."
          icone={<XCircle size={15} aria-hidden="true" />}
          className="border border-danger-line bg-surface text-danger-dark hover:bg-danger-soft"
        />
      </div>
    </form>
  );
}
