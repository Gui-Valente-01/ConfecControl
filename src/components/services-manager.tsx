import { Plus, Wrench } from "lucide-react";
import { createServiceAction, deleteServiceAction, updateServiceAction } from "@/app/servicos/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { InlineEdit } from "@/components/inline-edit";
import { SectionCard } from "@/components/section-card";
import { ToastForm } from "@/components/toast-form";
import { centsToCurrency, centsToInput } from "@/lib/format";

type DbService = {
  id: string;
  name: string;
  defaultPriceInCents: number;
};

type ServicesManagerProps = {
  services: DbService[];
  canEdit: boolean;
};

export function ServicesManager({ services, canEdit }: ServicesManagerProps) {
  return (
    <SectionCard
      eyebrow="Mão de obra"
      title="Serviços"
      action={
        <span className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">
          {services.length} {services.length === 1 ? "serviço" : "serviços"}
        </span>
      }
    >
      <p className="text-sm text-[#66756d]">
        Cadastre uma vez o que a confecção faz — silk, costura, bordado, corte. O valor aqui é o padrão sugerido; em
        cada peça você pode usar outro.
      </p>

      {services.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-4 text-center text-sm text-[#66756d]">
          Nenhum serviço cadastrado ainda.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {services.map((service) => (
            <li key={service.id} className="rounded-lg border border-[#d9e1dd] bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Wrench size={14} className="shrink-0 text-[#05605e]" aria-hidden="true" />
                  <span className="truncate text-sm font-medium">{service.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">{centsToCurrency(service.defaultPriceInCents)}</span>
                  {canEdit ? (
                    <ConfirmDeleteButton
                      action={deleteServiceAction}
                      id={service.id}
                      title="Remover serviço"
                      message={`Excluir o serviço ${service.name}? Ele sai do custo de todas as peças que o usam.`}
                    />
                  ) : null}
                </span>
              </div>
              <InlineEdit
                action={updateServiceAction}
                id={service.id}
                fields={[
                  { name: "name", label: "Serviço", defaultValue: service.name, required: true },
                  { name: "price", label: "Valor padrão (R$)", defaultValue: centsToInput(service.defaultPriceInCents) },
                ]}
              />
            </li>
          ))}
        </ul>
      )}

      <ToastForm action={createServiceAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#eef2ef] pt-4">
        <label className="min-w-32 flex-1">
          <span className="text-xs text-[#63736b]">Novo serviço</span>
          <input
            name="name"
            required
            placeholder="Ex.: Silk 1 cor"
            className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
          />
        </label>
        <label className="w-24">
          <span className="text-xs text-[#63736b]">Valor (R$)</span>
          <input
            name="price"
            placeholder="2,00"
            className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
          />
        </label>
        <button className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#087f7d] px-3 text-xs font-semibold text-white transition hover:bg-[#05605e]">
          <Plus size={14} aria-hidden="true" />
          Adicionar
        </button>
      </ToastForm>
    </SectionCard>
  );
}
