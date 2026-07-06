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
      <p className="text-sm text-[#66756d]">Defina as etapas pelas quais cada pedido passa. A ordem segue a posição.</p>

      <div className="mt-4 space-y-2">
        {stages.map((stage) => (
          <ToastForm key={stage.id} action={updateStageAction} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#d9e1dd] bg-white p-3 shadow-sm">
            <input type="hidden" name="id" value={stage.id} />
            <input type="color" name="color" defaultValue={stage.color || "#087f7d"} className="h-9 w-9 rounded border border-[#c7d3ce] bg-white" title="Cor" />
            <input name="name" defaultValue={stage.name} required className="h-9 flex-1 min-w-32 rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4" />
            <label className="flex items-center gap-1 text-xs text-[#63736b]">
              Pos.
              <input name="position" type="number" defaultValue={stage.position} className="h-9 w-16 rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4" />
            </label>
            <label className="flex items-center gap-1 text-xs text-[#63736b]">
              <input type="checkbox" name="active" defaultChecked={stage.active} className="size-4" />
              Ativa
            </label>
            <button className="h-9 rounded-lg border border-[#c7d3ce] bg-white px-3 text-xs font-semibold text-[#405047] transition hover:bg-[#f8faf9]">Salvar</button>
            {stage.inUse ? (
              <StatusBadge tone="neutral">em uso</StatusBadge>
            ) : (
              <ConfirmDeleteButton action={deleteStageAction} id={stage.id} title="Remover etapa" message={`Remover a etapa ${stage.name}?`} />
            )}
          </ToastForm>
        ))}
      </div>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#d9e1dd] pt-4">
        <input type="color" name="color" defaultValue="#087f7d" className="h-10 w-10 rounded border border-[#c7d3ce] bg-white" title="Cor" />
        <label className="flex-1 min-w-40">
          <span className="text-sm font-medium text-[#405047]">Nova etapa</span>
          <input name="name" required placeholder="Ex.: Revisão" className="mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4" />
        </label>
        <SubmitButton className="flex h-10 items-center gap-2 rounded-lg bg-[#087f7d] px-4 text-sm font-semibold text-white transition hover:bg-[#05605e] disabled:opacity-60">
          <Plus size={16} aria-hidden="true" />
          Adicionar
        </SubmitButton>
      </form>
      {state.error ? <p className="mt-2 rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">{state.error}</p> : null}
    </SectionCard>
  );
}
