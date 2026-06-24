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
      <p className="text-sm text-[#6f675b]">Defina as etapas pelas quais cada pedido passa. A ordem segue a posicao.</p>

      <div className="mt-4 space-y-2">
        {stages.map((stage) => (
          <ToastForm key={stage.id} action={updateStageAction} message="Etapa salva." className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] p-3">
            <input type="hidden" name="id" value={stage.id} />
            <input type="color" name="color" defaultValue={stage.color || "#0f8b8d"} className="h-9 w-9 rounded border border-[#d8cfbf] bg-white" title="Cor" />
            <input name="name" defaultValue={stage.name} required className="h-9 flex-1 min-w-32 rounded-lg border border-[#d8cfbf] px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4" />
            <label className="flex items-center gap-1 text-xs text-[#766d5d]">
              Pos.
              <input name="position" type="number" defaultValue={stage.position} className="h-9 w-16 rounded-lg border border-[#d8cfbf] px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4" />
            </label>
            <label className="flex items-center gap-1 text-xs text-[#766d5d]">
              <input type="checkbox" name="active" defaultChecked={stage.active} className="size-4" />
              Ativa
            </label>
            <button className="h-9 rounded-lg border border-[#d8cfbf] px-3 text-xs font-semibold text-[#544d43] transition hover:bg-[#f0e7d8]">Salvar</button>
            {stage.inUse ? (
              <StatusBadge tone="neutral">em uso</StatusBadge>
            ) : (
              <ConfirmDeleteButton action={deleteStageAction} id={stage.id} title="Remover etapa" message={`Remover a etapa ${stage.name}?`} toastMessage="Etapa removida." />
            )}
          </ToastForm>
        ))}
      </div>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#e3dbcd] pt-4">
        <input type="color" name="color" defaultValue="#0f8b8d" className="h-10 w-10 rounded border border-[#d8cfbf] bg-white" title="Cor" />
        <label className="flex-1 min-w-40">
          <span className="text-sm font-medium text-[#544d43]">Nova etapa</span>
          <input name="name" required placeholder="Ex.: Revisao" className="mt-1 h-10 w-full rounded-lg border border-[#d8cfbf] px-3 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4" />
        </label>
        <SubmitButton className="flex h-10 items-center gap-2 rounded-lg bg-[#1d1b16] px-4 text-sm font-semibold text-white transition disabled:opacity-60">
          <Plus size={16} aria-hidden="true" />
          Adicionar
        </SubmitButton>
      </form>
      {state.error ? <p className="mt-2 rounded-lg bg-[#fdecef] px-3 py-2 text-sm font-medium text-[#b23647]">{state.error}</p> : null}
    </SectionCard>
  );
}
