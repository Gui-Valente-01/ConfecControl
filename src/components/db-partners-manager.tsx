"use client";

import { Handshake, Mail, Phone, Plus, Power } from "lucide-react";
import { useActionState } from "react";
import { createPartnerAction, deletePartnerAction, togglePartnerActiveAction, updatePartnerAction } from "@/app/terceirizadas/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { describeDeletion } from "@/lib/deletion";
import { InlineEdit } from "@/components/inline-edit";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { ToastForm } from "@/components/toast-form";
import { useActionFeedback } from "@/components/toast";
import { useFieldError } from "@/components/use-field-error";
import { emptyFormState } from "@/lib/form-state";

type DbPartner = {
  id: string;
  name: string;
  service: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  orderCount: number;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4";

const suggestedServices = ["Bordado", "Estampa", "Lavanderia", "Corte", "Costura", "Estamparia", "Serigrafia"];

export function DbPartnersManager({ partners, canEdit }: { partners: DbPartner[]; canEdit: boolean }) {
  const [state, formAction] = useActionState(createPartnerAction, emptyFormState);
  useActionFeedback(state);
  const formRef = useFieldError(state);

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <datalist id="services-list">
        {suggestedServices.map((service) => (
          <option key={service} value={service} />
        ))}
      </datalist>

      <SectionCard
        eyebrow="Terceirização"
        title="Empresas terceirizadas"
        action={<div className="rounded-lg border border-[#d9e1dd] bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{partners.length} empresa(s)</div>}
      >
        {partners.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center">
            <Handshake className="mx-auto text-[#087f7d]" size={28} aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Nenhuma terceirizada cadastrada</h3>
            <p className="mt-2 text-sm text-[#66756d]">Cadastre empresas que fazem serviços externos (bordado, estampa, lavanderia...).</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {partners.map((partner) => (
            <article key={partner.id} className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm transition hover:border-[#c7d3ce]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg bg-[#e8f6f3] text-[#05605e]">
                      <Handshake size={20} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{partner.name}</h3>
                      <p className="mt-0.5 text-sm text-[#66756d]">{partner.service || "Serviço não informado"}</p>
                    </div>
                  </div>
                  <StatusBadge tone={partner.active ? "good" : "warn"}>{partner.active ? "Ativa" : "Inativa"}</StatusBadge>
                </div>

                <div className="mt-3 space-y-1 text-sm text-[#405047]">
                  {partner.contact ? <p>Contato: {partner.contact}</p> : null}
                  {partner.phone ? <p className="flex items-center gap-2"><Phone size={13} aria-hidden="true" />{partner.phone}</p> : null}
                  {partner.email ? <p className="flex items-center gap-2"><Mail size={13} aria-hidden="true" />{partner.email}</p> : null}
                  {partner.notes ? <p className="text-[#66756d]">{partner.notes}</p> : null}
                  <p className="text-xs text-[#8a9890]">{partner.orderCount} pedido(s) vinculado(s)</p>
                </div>

                {canEdit ? (
                  <InlineEdit
                    action={updatePartnerAction}
                    id={partner.id}
                    fields={[
                      { name: "name", label: "Nome", defaultValue: partner.name, required: true },
                      { name: "service", label: "Serviço", defaultValue: partner.service ?? "" },
                      { name: "contact", label: "Contato", defaultValue: partner.contact ?? "" },
                      { name: "phone", label: "Telefone", defaultValue: partner.phone ?? "" },
                      { name: "email", label: "E-mail", defaultValue: partner.email ?? "", type: "email" },
                      { name: "notes", label: "Observações", defaultValue: partner.notes ?? "", textarea: true },
                    ]}
                  />
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <ToastForm action={togglePartnerActiveAction}>
                    <input type="hidden" name="id" value={partner.id} />
                    <input type="hidden" name="active" value={(!partner.active).toString()} />
                    <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#c7d3ce] bg-white px-3 text-xs font-semibold text-[#405047] transition hover:bg-[#f8faf9]">
                      <Power size={13} aria-hidden="true" />
                      {partner.active ? "Desativar" : "Ativar"}
                    </button>
                  </ToastForm>
                  <ConfirmDeleteButton
                    action={deletePartnerAction}
                    id={partner.id}
                    title="Remover terceirizada"
                    message={describeDeletion({ tipo: "a terceirizada", nome: partner.name })}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard eyebrow="Nova terceirizada" title="Cadastrar empresa">
        <form ref={formRef} className="space-y-3" action={formAction}>
          <label className="block">
            <span className="text-sm font-medium text-[#405047]">Nome da empresa</span>
            <input name="name" required className={fieldClass} placeholder="Ex.: Bordados Aurora" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#405047]">Serviço prestado</span>
            <input name="service" list="services-list" className={fieldClass} placeholder="Bordado, estampa..." />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#405047]">Contato</span>
            <input name="contact" className={fieldClass} placeholder="Nome da pessoa" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[#405047]">Telefone</span>
              <input name="phone" type="tel" autoComplete="tel" className={fieldClass} placeholder="(11) 99999-9999" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#405047]">E-mail</span>
              <input name="email" type="email" className={fieldClass} placeholder="contato@empresa.com" />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-[#405047]">Observações</span>
            <textarea name="notes" className="mt-1 min-h-20 w-full rounded-lg border border-[#c7d3ce] px-3 py-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4" placeholder="Prazo médio, valores, etc." />
          </label>

          {state.error ? <p className="rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">{state.error}</p> : null}

          <SubmitButton>
            <Plus size={17} aria-hidden="true" />
            Salvar terceirizada
          </SubmitButton>
        </form>
      </SectionCard>
    </section>
  );
}
