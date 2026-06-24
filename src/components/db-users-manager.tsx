"use client";

import { Briefcase, KeyRound, Phone, Power, ShieldCheck, UserPlus } from "lucide-react";
import { useActionState } from "react";
import type { UserRole } from "@prisma/client";
import {
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
  updateUserDetailsAction,
  type UserFormState,
} from "@/app/usuarios/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { ToastForm } from "@/components/toast-form";
import { useActionFeedback } from "@/components/toast";
import { roleLabels } from "@/lib/roles";
import { suggestedSectors } from "@/lib/sectors";

type DbUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sector: string | null;
  phone: string | null;
  active: boolean;
  createdAt: Date;
};

type DbUsersManagerProps = {
  users: DbUser[];
  currentUserId: string;
};

const roleOrder: UserRole[] = ["ADMIN", "MANAGER", "PRODUCTION", "FINANCE", "SALES"];
const initialState: UserFormState = {};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-[#d8cfbf] px-3 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4";

export function DbUsersManager({ users, currentUserId }: DbUsersManagerProps) {
  const [state, formAction] = useActionState(createUserAction, initialState);
  useActionFeedback(state);

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <datalist id="sectors-list">
        {suggestedSectors.map((sector) => (
          <option key={sector} value={sector} />
        ))}
      </datalist>

      <SectionCard
        eyebrow="Equipe"
        title="Funcionários cadastrados"
        action={<div className="rounded-lg bg-[#f0e7d8] px-3 py-2 text-sm font-semibold text-[#544d43]">{users.length} funcionário(s)</div>}
      >
        <div className="space-y-3">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <article key={user.id} className="rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg bg-white text-[#0f8b8d]">
                      <ShieldCheck size={20} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {user.name}
                        {isSelf ? <span className="ml-2 text-xs font-normal text-[#9a9285]">(você)</span> : null}
                      </h3>
                      <p className="mt-0.5 text-sm text-[#6f675b]">{user.email}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#766d5d]">
                        <span className="inline-flex items-center gap-1"><Briefcase size={12} aria-hidden="true" />{user.sector || "Sem setor"}</span>
                        {user.phone ? <span className="inline-flex items-center gap-1"><Phone size={12} aria-hidden="true" />{user.phone}</span> : null}
                      </p>
                    </div>
                  </div>
                  <StatusBadge tone={user.active ? "good" : "warn"}>{user.active ? "Ativo" : "Inativo"}</StatusBadge>
                </div>

                <form action={updateUserDetailsAction} className="mt-4 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={user.id} />
                  <label>
                    <span className="text-xs text-[#766d5d]">Nome</span>
                    <input name="name" defaultValue={user.name} required className="mt-1 h-9 w-36 rounded-lg border border-[#d8cfbf] bg-white px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4" />
                  </label>
                  <label>
                    <span className="text-xs text-[#766d5d]">E-mail</span>
                    <input name="email" type="email" defaultValue={user.email} required className="mt-1 h-9 w-44 rounded-lg border border-[#d8cfbf] bg-white px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4" />
                  </label>
                  <label>
                    <span className="text-xs text-[#766d5d]">Cargo</span>
                    <select name="role" defaultValue={user.role} className="mt-1 h-9 rounded-lg border border-[#d8cfbf] bg-white px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4">
                      {roleOrder.map((role) => (
                        <option key={role} value={role}>{roleLabels[role]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="text-xs text-[#766d5d]">Setor</span>
                    <input name="sector" list="sectors-list" defaultValue={user.sector ?? ""} placeholder="Corte" className="mt-1 h-9 w-32 rounded-lg border border-[#d8cfbf] bg-white px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4" />
                  </label>
                  <label>
                    <span className="text-xs text-[#766d5d]">Telefone</span>
                    <input name="phone" defaultValue={user.phone ?? ""} placeholder="(11) ..." className="mt-1 h-9 w-32 rounded-lg border border-[#d8cfbf] bg-white px-2 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4" />
                  </label>
                  <button className="h-9 rounded-lg border border-[#d8cfbf] px-3 text-xs font-semibold text-[#544d43] transition hover:bg-[#f0e7d8]">
                    Salvar
                  </button>
                </form>

                {!isSelf ? (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <form action={toggleUserActiveAction}>
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="active" value={(!user.active).toString()} />
                      <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#d8cfbf] px-3 text-xs font-semibold text-[#544d43] transition hover:bg-[#f0e7d8]">
                        <Power size={13} aria-hidden="true" />
                        {user.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                    <ToastForm action={resetUserPasswordAction} message="Senha redefinida." className="flex items-end gap-1">
                      <input type="hidden" name="id" value={user.id} />
                      <input name="password" type="password" minLength={6} required placeholder="Nova senha" className="h-9 w-28 rounded-lg border border-[#d8cfbf] px-2 text-xs outline-none ring-[#0f8b8d]/20 focus:ring-4" />
                      <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#d8cfbf] px-3 text-xs font-semibold text-[#544d43] transition hover:bg-[#f0e7d8]">
                        <KeyRound size={13} aria-hidden="true" />
                        Redefinir
                      </button>
                    </ToastForm>
                    <ConfirmDeleteButton
                      action={deleteUserAction}
                      id={user.id}
                      title="Remover funcionário"
                      message={`Excluir o funcionário ${user.name}? Esta acao não pode ser desfeita.`}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Novo funcionário" title="Cadastrar funcionário">
        <form className="space-y-3" action={formAction}>
          <label className="block">
            <span className="text-sm font-medium text-[#544d43]">Nome</span>
            <input name="name" required className={fieldClass} placeholder="Ex.: Maria Souza" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#544d43]">E-mail (login)</span>
            <input name="email" type="email" required className={fieldClass} placeholder="maria@empresa.com" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#544d43]">Senha</span>
            <input name="password" type="password" required minLength={6} className={fieldClass} placeholder="mínimo 6 caracteres" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[#544d43]">Setor</span>
              <input name="sector" list="sectors-list" className={fieldClass} placeholder="Corte, Costura..." />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#544d43]">Telefone</span>
              <input name="phone" className={fieldClass} placeholder="(11) 99999-9999" />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-[#544d43]">Cargo (permissão)</span>
            <select name="role" defaultValue="PRODUCTION" className={fieldClass}>
              {roleOrder.map((role) => (
                <option key={role} value={role}>{roleLabels[role]}</option>
              ))}
            </select>
          </label>

          {state.error ? (
            <p className="rounded-lg bg-[#fdecef] px-3 py-2 text-sm font-medium text-[#b23647]">{state.error}</p>
          ) : null}

          <SubmitButton>
            <UserPlus size={17} aria-hidden="true" />
            Cadastrar funcionário
          </SubmitButton>
        </form>
      </SectionCard>
    </section>
  );
}
