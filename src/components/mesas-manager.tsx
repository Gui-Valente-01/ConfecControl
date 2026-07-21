"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { createMesaAction, deleteMesaAction, updateMesaAction } from "@/app/configuracoes/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { ToastForm } from "@/components/toast-form";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

type Mesa = {
  id: string;
  name: string;
  position: number;
  active: boolean;
  inUse: boolean;
};

export function MesasManager({ mesas }: { mesas: Mesa[] }) {
  const [state, formAction] = useActionState(createMesaAction, emptyFormState);
  useActionFeedback(state);

  return (
    <SectionCard eyebrow="Bancada" title="Mesas de trabalho">
      <p className="text-sm text-[#66756d]">
        Cadastre as mesas (ex.: Silk 1, Silk 2, Bordado). O funcionário escolhe a mesa ao pegar o pedido.
      </p>

      <div className="mt-4 space-y-2">
        {mesas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-4 text-center text-sm text-[#66756d]">
            Nenhuma mesa cadastrada ainda.
          </div>
        ) : (
          mesas.map((mesa) => (
            <ToastForm
              key={mesa.id}
              action={updateMesaAction}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-[#d9e1dd] bg-white p-3 shadow-sm"
            >
              <input type="hidden" name="id" value={mesa.id} />
              <input
                name="name"
                defaultValue={mesa.name}
                required
                className="h-9 min-w-32 flex-1 rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
              />
              <label className="flex items-center gap-1 text-xs text-[#63736b]">
                Pos.
                <input
                  name="position"
                  type="number"
                  defaultValue={mesa.position}
                  className="h-9 w-16 rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-[#63736b]">
                <input type="checkbox" name="active" defaultChecked={mesa.active} className="size-4" />
                Ativa
              </label>
              <button className="h-9 rounded-lg border border-[#c7d3ce] bg-white px-3 text-xs font-semibold text-[#405047] transition hover:bg-[#f8faf9]">
                Salvar
              </button>
              {mesa.inUse ? (
                <StatusBadge tone="neutral">em uso</StatusBadge>
              ) : (
                <ConfirmDeleteButton action={deleteMesaAction} id={mesa.id} title="Remover mesa" message={`Remover a mesa ${mesa.name}?`} />
              )}
            </ToastForm>
          ))
        )}
      </div>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#d9e1dd] pt-4">
        <label className="min-w-40 flex-1">
          <span className="text-sm font-medium text-[#405047]">Nova mesa</span>
          <input
            name="name"
            required
            placeholder="Ex.: Silk 1"
            className="mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
          />
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
