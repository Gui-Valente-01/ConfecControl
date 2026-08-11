"use client";

import type { UserRole } from "@prisma/client";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Pencil,
  Phone,
  Power,
  Search,
  ShieldCheck,
  UserCog,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
  updateUserDetailsAction,
  type UserFormState,
} from "@/app/usuarios/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SubmitButton } from "@/components/submit-button";
import { ToastForm } from "@/components/toast-form";
import { useActionFeedback } from "@/components/toast";
import { useFieldError } from "@/components/use-field-error";
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

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const roleOrder: UserRole[] = ["ADMIN", "MANAGER", "PRODUCTION", "FINANCE", "SALES"];
const initialState: UserFormState = {};

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[15px] text-fg outline-none ring-primary/20 transition placeholder:text-muted hover:border-line-strong focus:border-primary focus:ring-4";
const compactFieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-fg outline-none ring-primary/20 transition placeholder:text-muted hover:border-line-strong focus:border-primary focus:ring-4";
const labelClass = "text-sm font-medium text-body";
const compactLabelClass = "text-xs font-semibold text-body";

const roleBadgeClass: Record<UserRole, string> = {
  ADMIN: "border-ink bg-ink text-white",
  MANAGER: "border-info-line bg-info-soft text-info-ink",
  PRODUCTION: "border-primary/30 bg-primary-soft text-primary-dark",
  FINANCE: "border-warning-line bg-warning-soft text-warning-ink",
  SALES: "border-accent-line bg-accent-soft text-accent-ink",
};

const roleAvatarClass: Record<UserRole, string> = {
  ADMIN: "bg-ink text-white",
  MANAGER: "bg-info-soft text-info-ink",
  PRODUCTION: "bg-primary-soft text-primary-dark",
  FINANCE: "bg-warning-soft text-warning-ink",
  SALES: "bg-accent-soft text-accent-ink",
};

const roleDescriptions: Record<UserRole, string> = {
  ADMIN: "Acesso completo à empresa, inclusive configurações e gestão da equipe.",
  MANAGER: "Acompanha toda a operação, sem administrar os acessos da equipe.",
  PRODUCTION: "Acessa pedidos, produção e estoque para acompanhar a rotina da fábrica.",
  FINANCE: "Acessa clientes, pedidos, financeiro e relatórios da empresa.",
  SALES: "Acessa clientes, produtos e pedidos para conduzir o atendimento.",
};

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function peopleLabel(value: number) {
  return value === 1 ? "1 pessoa" : `${value} pessoas`;
}

export function DbUsersManager({ users, currentUserId }: DbUsersManagerProps) {
  const [state, formAction] = useActionState(createUserAction, initialState);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [newRole, setNewRole] = useState<UserRole>("PRODUCTION");
  const [showPassword, setShowPassword] = useState(false);
  useActionFeedback(state);
  const formRef = useFieldError(state);

  const activeUsers = users.filter((user) => user.active).length;
  const managerUsers = users.filter((user) => user.role === "ADMIN" || user.role === "MANAGER").length;
  const sectors = new Set(users.map((user) => user.sector).filter(Boolean)).size;

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

    return users.filter((user) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [user.name, user.email, user.sector ?? "", roleLabels[user.role]]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.active) ||
        (statusFilter === "INACTIVE" && !user.active);
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

      return matchesQuery && matchesStatus && matchesRole;
    });
  }, [query, roleFilter, statusFilter, users]);

  const hasActiveFilters = query.trim().length > 0 || statusFilter !== "ALL" || roleFilter !== "ALL";
  const metrics = [
    { label: "Na equipe", value: users.length, icon: UsersRound },
    { label: "Acessos ativos", value: activeUsers, icon: CheckCircle2 },
    { label: "Gestores", value: managerUsers, icon: UserCog },
    { label: "Setores", value: sectors, icon: Briefcase },
  ];

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setRoleFilter("ALL");
  }

  return (
    <section className="space-y-5">
      <datalist id="sectors-list">
        {suggestedSectors.map((sector) => (
          <option key={sector} value={sector} />
        ))}
      </datalist>

      <section className="overflow-hidden rounded-2xl border border-[#24342c] bg-ink text-white shadow-[var(--cc-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 md:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ec9c1]">Visão geral da equipe</p>
            <h2 className="mt-1 text-xl font-semibold md:text-2xl">Pessoas certas, com o acesso certo.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#c8d6cf]">
              Gerencie funções, dados e segurança dos funcionários sem perder o controle da operação.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-[#dce8e2] sm:flex">
            <ShieldCheck size={15} aria-hidden="true" />
            Área exclusiva do dono
          </div>
        </div>

        <dl className="grid grid-cols-2 border-t border-white/10 bg-white/[0.035] sm:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className={`px-4 py-3.5 md:px-5 ${index % 2 === 0 ? "border-r border-white/10" : ""} ${
                  index >= 2 ? "border-t border-white/10 sm:border-t-0" : ""
                } ${index < 3 ? "sm:border-r sm:border-white/10" : "sm:border-r-0"}`}
              >
                <dt className="flex items-center gap-2 text-xs font-medium text-[#a9bbb2]">
                  <Icon size={14} aria-hidden="true" />
                  {metric.label}
                </dt>
                <dd className="mt-1 text-xl font-semibold text-white">{metric.value}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--cc-shadow-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-canvas px-4 py-4 md:px-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Funcionários</p>
              <h2 className="mt-0.5 text-lg font-semibold text-fg">Sua equipe</h2>
              <p className="mt-1 text-sm text-body">Consulte, edite e proteja os acessos da empresa.</p>
            </div>
            <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-body">
              {peopleLabel(users.length)}
            </span>
          </div>

          <div className="grid gap-2.5 border-b border-line p-4 md:grid-cols-[minmax(0,1fr)_150px_170px] md:p-5">
            <label className="relative block">
              <span className="sr-only">Buscar funcionário</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={17}
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 w-full rounded-xl border border-line-strong bg-surface pl-10 pr-3 text-sm outline-none ring-primary/20 placeholder:text-muted transition hover:border-line-strong focus:border-primary focus:ring-4"
                placeholder="Nome, e-mail, setor ou cargo"
              />
            </label>
            <label>
              <span className="sr-only">Filtrar por status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-body outline-none ring-primary/20 transition hover:border-line-strong focus:border-primary focus:ring-4"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filtrar por cargo</span>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as UserRole | "ALL")}
                className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-body outline-none ring-primary/20 transition hover:border-line-strong focus:border-primary focus:ring-4"
              >
                <option value="ALL">Todos os cargos</option>
                {roleOrder.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider px-4 py-2.5 text-xs text-muted md:px-5">
            <p aria-live="polite">
              Exibindo <strong className="font-semibold text-body">{filteredUsers.length}</strong> de {users.length}
            </p>
            {hasActiveFilters ? (
              <button type="button" onClick={clearFilters} className="font-semibold text-primary-dark hover:underline">
                Limpar filtros
              </button>
            ) : null}
          </div>

          <div className="p-4 md:p-5">
            {users.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line-strong bg-canvas px-5 py-10 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-dark">
                  <UserPlus size={22} aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold text-fg">Monte sua equipe</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-body">
                  Adicione o primeiro funcionário e escolha exatamente quais áreas ele poderá acessar.
                </p>
                <a href="#novo-acesso" className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
                  Adicionar funcionário
                </a>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line-strong bg-canvas px-5 py-10 text-center">
                <Search className="mx-auto text-muted" size={24} aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-fg">Nenhum resultado encontrado</h3>
                <p className="mt-1 text-sm text-body">Tente outro nome ou remova um dos filtros.</p>
                <button type="button" onClick={clearFilters} className="mt-4 h-10 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-body hover:bg-tint">
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <article
                      key={user.id}
                      className="overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-line-strong hover:shadow-[0_10px_28px_rgba(17,26,22,0.07)]"
                    >
                      <div className="p-4 md:p-5">
                        <div className="flex min-w-0 items-start gap-3.5">
                          <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${roleAvatarClass[user.role]}`} aria-hidden="true">
                            {getInitials(user.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-base font-semibold text-fg">{user.name}</h3>
                              {isSelf ? (
                                <span className="rounded-full border border-line bg-tint px-2.5 py-1 text-xs font-semibold text-body">
                                  Seu acesso
                                </span>
                              ) : null}
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${roleBadgeClass[user.role]}`}>
                                {roleLabels[user.role]}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${
                                  user.active
                                    ? "border-primary/30 bg-primary-soft text-primary-dark"
                                    : "border-danger-line bg-danger-soft text-danger-dark"
                                }`}
                              >
                                <span className={`size-1.5 rounded-full ${user.active ? "bg-primary" : "bg-danger"}`} aria-hidden="true" />
                                {user.active ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                            <p className="mt-1 break-all text-sm text-body">{user.email}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 rounded-xl border border-divider bg-canvas p-3 sm:grid-cols-2 2xl:grid-cols-3">
                          <div>
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                              <Briefcase size={12} aria-hidden="true" /> Setor
                            </p>
                            <p className="mt-1 text-sm font-medium text-body">{user.sector || "Não informado"}</p>
                          </div>
                          <div>
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                              <Phone size={12} aria-hidden="true" /> Telefone
                            </p>
                            <p className="mt-1 text-sm font-medium text-body">{user.phone || "Não informado"}</p>
                          </div>
                          <div className="sm:col-span-2 2xl:col-span-1">
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                              <CalendarDays size={12} aria-hidden="true" /> Criado em
                            </p>
                            <p className="mt-1 text-sm font-medium text-body">{formatLongDate(user.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      <details className="group/details border-t border-line bg-canvas">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-body transition hover:bg-tint hover:text-primary-dark md:px-5 [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-2">
                            <Pencil size={15} aria-hidden="true" />
                            {isSelf ? "Editar meus dados" : "Gerenciar acesso"}
                          </span>
                          <ChevronDown className="transition-transform group-open/details:rotate-180" size={17} aria-hidden="true" />
                        </summary>

                        <div className="border-t border-line bg-surface p-4 md:p-5">
                          <div className="mb-4">
                            <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                              <UserCog size={16} className="text-primary-dark" aria-hidden="true" />
                              Dados e permissões
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted">
                              Atualize as informações usadas no acesso e na identificação da equipe.
                            </p>
                          </div>

                          <ToastForm action={updateUserDetailsAction} className="grid gap-3 md:grid-cols-2">
                            <input type="hidden" name="id" value={user.id} />
                            <label>
                              <span className={compactLabelClass}>Nome</span>
                              <input name="name" autoComplete="name" defaultValue={user.name} required className={compactFieldClass} />
                            </label>
                            <label>
                              <span className={compactLabelClass}>E-mail</span>
                              <input name="email" type="email" autoComplete="email" defaultValue={user.email} required className={compactFieldClass} />
                            </label>
                            <label>
                              <span className={compactLabelClass}>Cargo</span>
                              {isSelf ? (
                                <>
                                  <input type="hidden" name="role" value={user.role} />
                                  <div className="mt-1.5 flex h-11 items-center rounded-xl border border-line bg-tint px-3 text-sm font-semibold text-body">
                                    {roleLabels[user.role]}
                                  </div>
                                </>
                              ) : (
                                <select name="role" defaultValue={user.role} className={compactFieldClass}>
                                  {roleOrder.map((role) => (
                                    <option key={role} value={role}>
                                      {roleLabels[role]}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </label>
                            <label>
                              <span className={compactLabelClass}>Setor</span>
                              <input name="sector" list="sectors-list" defaultValue={user.sector ?? ""} className={compactFieldClass} />
                            </label>
                            <label>
                              <span className={compactLabelClass}>Telefone</span>
                              <input name="phone" type="tel" autoComplete="tel" defaultValue={user.phone ?? ""} className={compactFieldClass} />
                            </label>
                            <div className="flex items-end">
                              <SubmitButton
                                pendingText="Salvando dados..."
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <UserCog size={16} aria-hidden="true" />
                                Salvar alterações
                              </SubmitButton>
                            </div>
                          </ToastForm>

                          {isSelf ? (
                            <div className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-canvas p-3.5">
                              <LockKeyhole className="mt-0.5 shrink-0 text-primary-dark" size={17} aria-hidden="true" />
                              <p className="text-xs leading-5 text-body">
                                Seu cargo é protegido. Para trocar sua própria senha, acesse{" "}
                                <Link href="/conta" className="font-semibold text-primary-dark hover:underline">
                                  Minha conta
                                </Link>
                                .
                              </p>
                            </div>
                          ) : (
                            <div className="mt-5 rounded-xl border border-line bg-canvas p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-dark">
                                  <KeyRound size={17} aria-hidden="true" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-fg">Segurança do acesso</p>
                                  <p className="mt-0.5 text-xs leading-5 text-muted">
                                    Redefina a senha ou suspenda o acesso quando necessário.
                                  </p>
                                </div>
                              </div>

                              <ToastForm action={resetUserPasswordAction} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                <input type="hidden" name="id" value={user.id} />
                                <label>
                                  <span className={compactLabelClass}>Nova senha</span>
                                  <input
                                    name="password"
                                    type="password"
                                    minLength={6}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Mínimo de 6 caracteres"
                                    className={compactFieldClass}
                                  />
                                </label>
                                <SubmitButton
                                  pendingText="Redefinindo..."
                                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-body transition hover:bg-tint disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                  <KeyRound size={15} aria-hidden="true" />
                                  Redefinir senha
                                </SubmitButton>
                              </ToastForm>

                              <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
                                <ToastForm action={toggleUserActiveAction}>
                                  <input type="hidden" name="id" value={user.id} />
                                  <input type="hidden" name="active" value={(!user.active).toString()} />
                                  <button
                                    type="submit"
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-body transition hover:bg-tint sm:w-auto"
                                  >
                                    <Power size={15} aria-hidden="true" />
                                    {user.active ? "Desativar acesso" : "Reativar acesso"}
                                  </button>
                                </ToastForm>
                                <div className="sm:ml-auto [&_button]:h-11 [&_button]:w-full [&_button]:rounded-xl sm:[&_button]:w-auto">
                                  <ConfirmDeleteButton
                                    action={deleteUserAction}
                                    id={user.id}
                                    title="Excluir funcionário"
                                    message={`Excluir o funcionário ${user.name}? Esta ação não pode ser desfeita.`}
                                    variant="full"
                                    label="Excluir funcionário"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside id="novo-acesso" className="scroll-mt-28 xl:sticky xl:top-28">
          <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--cc-shadow-soft)]">
            <div className="border-b border-line bg-canvas px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-dark">
                  <UserPlus size={19} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Novo acesso</p>
                  <h2 className="mt-0.5 text-lg font-semibold text-fg">Adicionar funcionário</h2>
                  <p className="mt-1 text-sm leading-5 text-body">Crie um login e defina o nível de acesso.</p>
                </div>
              </div>
            </div>

            <form ref={formRef} className="space-y-4 p-5" action={formAction} autoComplete="off">
              <p className="text-xs text-muted">
                Campos marcados com <span className="font-bold text-danger-dark">*</span> são obrigatórios.
              </p>
              <label className="block">
                <span className={labelClass}>Nome completo <span className="text-danger-dark">*</span></span>
                <input name="name" autoComplete="name" required className={fieldClass} placeholder="Ex.: Maria Souza" />
              </label>
              <label className="block">
                <span className={labelClass}>E-mail de login <span className="text-danger-dark">*</span></span>
                <input name="email" type="email" autoComplete="email" required className={fieldClass} placeholder="maria@empresa.com" />
              </label>
              <label className="block">
                <span className={labelClass}>Senha inicial <span className="text-danger-dark">*</span></span>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    aria-describedby="new-password-help"
                    className={`${fieldClass} pr-12`}
                    placeholder="Mínimo de 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute bottom-0 right-0 flex size-11 items-center justify-center rounded-r-xl text-body transition hover:bg-tint hover:text-primary-dark"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  </button>
                </div>
                <span id="new-password-help" className="mt-1.5 block text-xs leading-5 text-muted">
                  Compartilhe por um canal seguro e peça a troca no primeiro acesso.
                </span>
              </label>
              <label className="block">
                <span className={labelClass}>Cargo de acesso <span className="text-danger-dark">*</span></span>
                <select
                  name="role"
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value as UserRole)}
                  className={fieldClass}
                >
                  {roleOrder.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-soft p-3.5">
                <ShieldCheck className="mt-0.5 shrink-0 text-primary-dark" size={17} aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-primary-dark">Permissões de {roleLabels[newRole]}</p>
                  <p className="mt-1 text-xs leading-5 text-body">{roleDescriptions[newRole]}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="block">
                  <span className={labelClass}>Setor <span className="font-normal text-muted">(opcional)</span></span>
                  <input name="sector" list="sectors-list" className={fieldClass} placeholder="Corte, Costura..." />
                </label>
                <label className="block">
                  <span className={labelClass}>Telefone <span className="font-normal text-muted">(opcional)</span></span>
                  <input name="phone" type="tel" autoComplete="tel" className={fieldClass} placeholder="(11) 99999-9999" />
                </label>
              </div>

              {state.error ? (
                <p role="alert" className="rounded-xl border border-danger-line bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-dark">
                  {state.error}
                </p>
              ) : null}

              <SubmitButton
                pendingText="Criando acesso..."
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus size={17} aria-hidden="true" />
                Criar acesso seguro
              </SubmitButton>

              <div className="flex items-start gap-2 rounded-xl bg-canvas px-3.5 py-3 text-xs leading-5 text-body">
                <LockKeyhole className="mt-0.5 shrink-0 text-primary-dark" size={15} aria-hidden="true" />
                O novo funcionário verá apenas as áreas permitidas para o cargo escolhido.
              </div>
            </form>
          </section>
        </aside>
      </div>
    </section>
  );
}
