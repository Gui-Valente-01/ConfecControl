"use client";

import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Power,
  ShieldCheck,
  UserCog,
  UserPlus,
  UsersRound,
} from "lucide-react";
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
import { formatLongDate } from "@/lib/format";
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
  "mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4";
const compactFieldClass =
  "mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] bg-white px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4";

const roleBadgeClass: Record<UserRole, string> = {
  ADMIN: "border-[#111a16] bg-[#111a16] text-white",
  MANAGER: "border-[#bfcedf] bg-[#eef5fb] text-[#2a5a89]",
  PRODUCTION: "border-[#bfe4dc] bg-[#e8f6f3] text-[#05605e]",
  FINANCE: "border-[#ead49c] bg-[#fff7dd] text-[#7b5a0b]",
  SALES: "border-[#e4c4d8] bg-[#fbf0f7] text-[#7c3d68]",
};

export function DbUsersManager({ users, currentUserId }: DbUsersManagerProps) {
  const [state, formAction] = useActionState(createUserAction, initialState);
  useActionFeedback(state);

  const activeUsers = users.filter((user) => user.active).length;
  const inactiveUsers = users.length - activeUsers;
  const ownerUsers = users.filter((user) => user.role === "ADMIN").length;
  const sectors = new Set(users.map((user) => user.sector).filter(Boolean)).size;

  return (
    <section className="space-y-5">
      <datalist id="sectors-list">
        {suggestedSectors.map((sector) => (
          <option key={sector} value={sector} />
        ))}
      </datalist>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Acessos", value: users.length, icon: UsersRound },
          { label: "Ativos", value: activeUsers, icon: CheckCircle2 },
          { label: "Inativos", value: inactiveUsers, icon: Power },
          { label: "Setores", value: sectors, icon: Briefcase },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-medium text-[#63736b]">
                <Icon size={14} aria-hidden="true" />
                {metric.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#1c2420]">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <SectionCard eyebrow="Novo acesso" title="Criar login">
          <form className="space-y-3" action={formAction}>
            <label className="block">
              <span className="text-sm font-medium text-[#405047]">Nome do funcionário</span>
              <input name="name" required className={fieldClass} placeholder="Ex.: Maria Souza" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#405047]">E-mail de login</span>
              <input name="email" type="email" required className={fieldClass} placeholder="maria@empresa.com" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#405047]">Senha inicial</span>
              <input name="password" type="password" required minLength={6} className={fieldClass} placeholder="mínimo 6 caracteres" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#405047]">Cargo de acesso</span>
              <select name="role" defaultValue="PRODUCTION" className={fieldClass}>
                {roleOrder.map((role) => (
                  <option key={role} value={role}>{roleLabels[role]}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block">
                <span className="text-sm font-medium text-[#405047]">Setor</span>
                <input name="sector" list="sectors-list" className={fieldClass} placeholder="Corte, Costura..." />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#405047]">Telefone</span>
                <input name="phone" className={fieldClass} placeholder="(11) 99999-9999" />
              </label>
            </div>

            {state.error ? (
              <p className="rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">{state.error}</p>
            ) : null}

            <SubmitButton pendingText="Criando acesso...">
              <UserPlus size={17} aria-hidden="true" />
              Criar acesso
            </SubmitButton>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Funcionários"
          title="Acessos da equipe"
          action={
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="good">{activeUsers} ativos</StatusBadge>
              <StatusBadge tone="dark">{ownerUsers} dono(s)</StatusBadge>
            </div>
          }
        >
          {users.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-6 text-center text-sm text-[#66756d]">
              Nenhum funcionário cadastrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-[#edf2ef]">
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <article key={user.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#e8f6f3] text-[#05605e]">
                          <ShieldCheck size={20} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-[#1c2420]">{user.name}</h3>
                            {isSelf ? <span className="rounded-md bg-[#eef4f1] px-2 py-1 text-xs font-semibold text-[#405047]">você</span> : null}
                            <span className={`rounded-md border px-2 py-1 text-xs font-semibold leading-none ${roleBadgeClass[user.role]}`}>
                              {roleLabels[user.role]}
                            </span>
                            <StatusBadge tone={user.active ? "good" : "warn"}>{user.active ? "Ativo" : "Inativo"}</StatusBadge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#63736b]">
                            <span className="inline-flex items-center gap-1">
                              <Mail size={12} aria-hidden="true" />
                              {user.email}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Briefcase size={12} aria-hidden="true" />
                              {user.sector || "Sem setor"}
                            </span>
                            {user.phone ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone size={12} aria-hidden="true" />
                                {user.phone}
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays size={12} aria-hidden="true" />
                              {formatLongDate(user.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {!isSelf ? (
                          <ToastForm action={toggleUserActiveAction}>
                            <input type="hidden" name="id" value={user.id} />
                            <input type="hidden" name="active" value={(!user.active).toString()} />
                            <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#c7d3ce] bg-white px-3 text-xs font-semibold text-[#405047] transition hover:bg-[#f8faf9]">
                              <Power size={13} aria-hidden="true" />
                              {user.active ? "Desativar" : "Ativar"}
                            </button>
                          </ToastForm>
                        ) : null}
                        {!isSelf ? (
                          <ConfirmDeleteButton
                            action={deleteUserAction}
                            id={user.id}
                            title="Excluir funcionário"
                            message={`Excluir o funcionário ${user.name}? Esta ação não pode ser desfeita.`}
                            variant="full"
                            label="Excluir"
                          />
                        ) : null}
                      </div>
                    </div>

                    <details className="mt-3 rounded-lg border border-[#edf2ef] bg-[#f8faf9]">
                      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-semibold text-[#405047] transition hover:text-[#087f7d]">
                        <Pencil size={14} aria-hidden="true" />
                        Editar dados e senha
                      </summary>
                      <div className="border-t border-[#edf2ef] p-3">
                        <ToastForm action={updateUserDetailsAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <input type="hidden" name="id" value={user.id} />
                          <label>
                            <span className="text-xs font-medium text-[#63736b]">Nome</span>
                            <input name="name" defaultValue={user.name} required className={compactFieldClass} />
                          </label>
                          <label>
                            <span className="text-xs font-medium text-[#63736b]">E-mail</span>
                            <input name="email" type="email" defaultValue={user.email} required className={compactFieldClass} />
                          </label>
                          <label>
                            <span className="text-xs font-medium text-[#63736b]">Cargo</span>
                            {isSelf ? (
                              <>
                                <input type="hidden" name="role" value={user.role} />
                                <div className="mt-1 flex h-9 items-center rounded-lg border border-[#d9e1dd] bg-[#eef4f1] px-2 text-sm font-semibold text-[#405047]">
                                  {roleLabels[user.role]}
                                </div>
                              </>
                            ) : (
                              <select name="role" defaultValue={user.role} className={compactFieldClass}>
                                {roleOrder.map((role) => (
                                  <option key={role} value={role}>{roleLabels[role]}</option>
                                ))}
                              </select>
                            )}
                          </label>
                          <label>
                            <span className="text-xs font-medium text-[#63736b]">Setor</span>
                            <input name="sector" list="sectors-list" defaultValue={user.sector ?? ""} className={compactFieldClass} />
                          </label>
                          <label>
                            <span className="text-xs font-medium text-[#63736b]">Telefone</span>
                            <input name="phone" defaultValue={user.phone ?? ""} className={compactFieldClass} />
                          </label>
                          <div className="flex items-end">
                            <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#087f7d] px-3 text-sm font-semibold text-white transition hover:bg-[#05605e]">
                              <UserCog size={15} aria-hidden="true" />
                              Salvar dados
                            </button>
                          </div>
                        </ToastForm>

                        {!isSelf ? (
                          <ToastForm action={resetUserPasswordAction} className="mt-3 flex flex-wrap items-end gap-2">
                            <input type="hidden" name="id" value={user.id} />
                            <label className="min-w-48 flex-1">
                              <span className="text-xs font-medium text-[#63736b]">Nova senha</span>
                              <input name="password" type="password" minLength={6} required placeholder="mínimo 6 caracteres" className={compactFieldClass} />
                            </label>
                            <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#c7d3ce] bg-white px-3 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]">
                              <KeyRound size={15} aria-hidden="true" />
                              Redefinir senha
                            </button>
                          </ToastForm>
                        ) : null}
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </section>
  );
}
