"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { createStageAction, deleteStageAction, updateStageAction } from "@/app/configuracoes/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { ToastForm } from "@/components/toast-form";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

type Stage = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  active: boolean;
  inUse: boolean;
};

export function StagesManager({ stages }: { stages: Stage[] }) {
  const [state, formAction] = useActionState(createStageAction, emptyFormState);
  useActionFeedback(state);

  return (
    <SectionCard eyebrow="Produção" title="Etapas da produção">
      <p className="text-sm text-muted">Defina as etapas pelas quais cada pedido passa. A ordem segue a posição.</p>

      <div className="mt-4 space-y-2">
        {stages.map((stage) => (
          <ToastForm key={stage.id} action={updateStageAction} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-3 shadow-sm">
            <input type="hidden" name="id" value={stage.id} />
            <input type="color" name="color" defaultValue={stage.color || "#087f7d"} className="h-9 w-9 rounded border border-line-strong bg-surface" title="Cor" />
            <input name="name" defaultValue={stage.name} required className="h-9 flex-1 min-w-32 rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4" />
            <label className="flex items-center gap-1 text-xs text-muted">
              Pos.
              <input name="position" type="number" defaultValue={stage.position} className="h-9 w-16 rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4" />
            </label>
            <label className="flex items-center gap-1 text-xs text-muted">
              <input type="checkbox" name="active" defaultChecked={stage.active} className="size-4" />
              Ativa
            </label>
            <button className="h-9 rounded-lg border border-line-strong bg-surface px-3 text-xs font-semibold text-body transition hover:bg-canvas">Salvar</button>
            {stage.inUse ? (
              <StatusBadge tone="neutral">em uso</StatusBadge>
            ) : (
              <ConfirmDeleteButton action={deleteStageAction} id={stage.id} title="Remover etapa" message={`Remover a etapa ${stage.name}?`} />
            )}
          </ToastForm>
        ))}
      </div>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
        <input type="color" name="color" defaultValue="#087f7d" className="h-10 w-10 rounded border border-line-strong bg-surface" title="Cor" />
        <label className="flex-1 min-w-40">
          <span className="text-sm font-medium text-body">Nova etapa</span>
          <input name="name" required placeholder="Ex.: Revisão" className="mt-1 h-10 w-full rounded-lg border border-line-strong px-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4" />
        </label>
        <SubmitButton className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60">
          <Plus size={16} aria-hidden="true" />
          Adicionar
        </SubmitButton>
      </form>
      {state.error ? <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger-dark">{state.error}</p> : null}
    </SectionCard>
  );
}
