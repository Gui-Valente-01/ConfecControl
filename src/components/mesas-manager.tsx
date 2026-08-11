"use client";

import { Layers, Plus, UserRound } from "lucide-react";
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
  responsibleUserId: string | null;
  stageId: string | null;
};

type TeamMember = { id: string; name: string };
type StageOption = { id: string; name: string };

export function MesasManager({
  mesas,
  team,
  stages,
}: {
  mesas: Mesa[];
  team: TeamMember[];
  stages: StageOption[];
}) {
  const [state, formAction] = useActionState(createMesaAction, emptyFormState);
  useActionFeedback(state);

  return (
    <SectionCard eyebrow="Bancada" title="Mesas de trabalho">
      <p className="text-sm text-muted">
        Cadastre as mesas (ex.: Silk 1, Silk 2, Bordado) e defina quem responde por cada uma. O funcionário escolhe a
        mesa ao pegar o pedido; o responsável é quem você procura quando aquela estação trava.
      </p>

      <div className="mt-4 space-y-2">
        {mesas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-canvas p-4 text-center text-sm text-muted">
            Nenhuma mesa cadastrada ainda.
          </div>
        ) : (
          mesas.map((mesa) => (
            <ToastForm
              key={mesa.id}
              action={updateMesaAction}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-3 shadow-sm"
            >
              <input type="hidden" name="id" value={mesa.id} />
              <input
                name="name"
                defaultValue={mesa.name}
                required
                className="h-9 min-w-32 flex-1 rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
              />
              <label className="flex items-center gap-1 text-xs text-muted">
                Pos.
                <input
                  name="position"
                  type="number"
                  defaultValue={mesa.position}
                  className="h-9 w-16 rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-muted">
                <UserRound size={13} aria-hidden="true" />
                <span className="sr-only">Responsável pela mesa {mesa.name}</span>
                <select
                  name="responsibleUserId"
                  defaultValue={mesa.responsibleUserId ?? ""}
                  className="h-9 min-w-36 rounded-lg border border-line-strong bg-surface px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                >
                  <option value="">Sem responsável</option>
                  {team.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </label>
              {/* Etapa que a mesa atende: é o que impede um pedido de entrar
                  na bancada errada. Em branco, a mesa aceita qualquer pedido. */}
              <label className="flex items-center gap-1 text-xs text-muted">
                <Layers size={13} aria-hidden="true" />
                <span className="sr-only">Etapa atendida pela mesa {mesa.name}</span>
                <select
                  name="stageId"
                  defaultValue={mesa.stageId ?? ""}
                  className="h-9 min-w-36 rounded-lg border border-line-strong bg-surface px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                >
                  <option value="">Aceita qualquer etapa</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-xs text-muted">
                <input type="checkbox" name="active" defaultChecked={mesa.active} className="size-4" />
                Ativa
              </label>
              <button className="h-9 rounded-lg border border-line-strong bg-surface px-3 text-xs font-semibold text-body transition hover:bg-canvas">
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

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
        <label className="min-w-40 flex-1">
          <span className="text-sm font-medium text-body">Nova mesa</span>
          <input
            name="name"
            required
            placeholder="Ex.: Silk 1"
            className="mt-1 h-10 w-full rounded-lg border border-line-strong px-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
          />
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
