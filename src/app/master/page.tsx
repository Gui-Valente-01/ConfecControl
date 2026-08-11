import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Ban, Building2, CheckCircle2, ClipboardList, KeyRound, Plus, Users } from "lucide-react";
import { createSignupTokenAction, revokeSignupTokenAction, updateCompanyFeaturesAction } from "@/app/master/actions";
import { SubmitButton } from "@/components/submit-button";
import { ToastForm } from "@/components/toast-form";
import { requireUser, roleLabels } from "@/lib/auth";
import { featureKeys, featureLabel, sanitizeFeatures } from "@/lib/features";
import { FeaturePicker } from "@/components/feature-picker";
import { formatDateTime, formatLongDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// E-mails com acesso ao painel master (donos do sistema), via env.
function superAdminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function tokenStatus(token: { usedAt: Date | null; revokedAt: Date | null }) {
  if (token.revokedAt) return { label: "Revogado", className: "border-danger-line bg-danger-soft text-danger-dark" };
  if (token.usedAt) return { label: "Usado", className: "border-primary/30 bg-primary-soft text-primary-dark" };
  return { label: "Disponível", className: "border-line bg-tint text-body" };
}

export default async function MasterPage() {
  const user = await requireUser();
  if (!superAdminEmails().includes(user.email.toLowerCase())) redirect("/");

  const [companies, signupTokens] = await Promise.all([
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        },
        orders: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        _count: { select: { orders: true, clients: true } },
      },
    }),
    prisma.signupToken.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { usedCompany: { select: { name: true } } },
    }),
  ]);

  const totalUsers = companies.reduce((sum, company) => sum + company.users.length, 0);
  const totalOrders = companies.reduce((sum, company) => sum + company._count.orders, 0);
  const availableTokens = signupTokens.filter((token) => !token.usedAt && !token.revokedAt).length;

  return (
    <main className="min-h-screen bg-shell px-4 py-8 text-fg md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Painel master</p>
            <h1 className="mt-0.5 text-2xl font-semibold">Admin geral do ConfecControl</h1>
            <p className="mt-1 text-sm text-muted">Gere tokens de cadastro e acompanhe as empresas que entraram.</p>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-body transition hover:bg-canvas"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar ao painel
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-medium text-muted">
              <Building2 size={14} aria-hidden="true" />
              Empresas
            </p>
            <p className="mt-1 text-2xl font-semibold">{companies.length}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-medium text-muted">
              <Users size={14} aria-hidden="true" />
              Usuários
            </p>
            <p className="mt-1 text-2xl font-semibold">{totalUsers}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-medium text-muted">
              <ClipboardList size={14} aria-hidden="true" />
              Pedidos criados
            </p>
            <p className="mt-1 text-2xl font-semibold">{totalOrders}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-medium text-muted">
              <KeyRound size={14} aria-hidden="true" />
              Tokens livres
            </p>
            <p className="mt-1 text-2xl font-semibold">{availableTokens}</p>
          </div>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[420px_1fr]">
          <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Novo cliente</p>
            <h2 className="mt-1 text-lg font-semibold">Gerar token de cadastro</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Crie um token, passe a numeração para o cliente e ele usa esse token uma única vez em /cadastro.
            </p>

            <ToastForm action={createSignupTokenAction} className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-body">Cliente ou empresa</span>
                <input
                  name="clientName"
                  required
                  placeholder="Ex.: Confecção Estrela"
                  className="mt-1 h-10 w-full rounded-lg border border-line-strong px-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-body">E-mail de contato</span>
                <input
                  name="contactEmail"
                  type="email"
                  placeholder="cliente@empresa.com"
                  className="mt-1 h-10 w-full rounded-lg border border-line-strong px-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-body">Módulos que este cliente contratou</legend>
                <p className="text-xs text-soft">
                  Sempre incluso: pedidos, clientes, produtos e configurações. Escolha um plano pronto e ajuste se o
                  cliente pedir algo diferente.
                </p>
                <FeaturePicker defaultSelected={featureKeys} />
              </fieldset>

              <SubmitButton pendingText="Gerando...">
                <Plus size={16} aria-hidden="true" />
                Gerar token
              </SubmitButton>
            </ToastForm>
          </div>

          <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Tokens</p>
                <h2 className="mt-1 text-lg font-semibold">Códigos para novos clientes</h2>
              </div>
              <span className="rounded-md bg-tint px-2 py-1 text-xs font-semibold text-body">
                {signupTokens.length} recentes
              </span>
            </div>

            {signupTokens.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-line-strong bg-canvas p-6 text-center text-sm text-muted">
                Nenhum token criado ainda.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {signupTokens.map((token) => {
                  const status = tokenStatus(token);
                  const canRevoke = !token.usedAt && !token.revokedAt;

                  return (
                    <article key={token.id} className="rounded-lg border border-line bg-canvas p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-2xl font-semibold tracking-[0.14em] text-fg">{token.code}</p>
                          <p className="mt-1 text-sm font-medium">{token.clientName || "Cliente sem nome"}</p>
                          {token.contactEmail ? <p className="text-xs text-muted">{token.contactEmail}</p> : null}
                        </div>
                        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-muted">
                        <p>Criado por {token.createdByEmail} em {formatDateTime(token.createdAt)}</p>
                        {token.usedAt ? (
                          <p className="flex items-center gap-1 text-primary-dark">
                            <CheckCircle2 size={13} aria-hidden="true" />
                            Usado por {token.usedByEmail || "cliente"} em {formatDateTime(token.usedAt)}
                            {token.usedCompany ? ` (${token.usedCompany.name})` : ""}
                          </p>
                        ) : null}
                        {token.revokedAt ? (
                          <p className="flex items-center gap-1 text-danger-dark">
                            <Ban size={13} aria-hidden="true" />
                            Revogado em {formatDateTime(token.revokedAt)}
                          </p>
                        ) : null}
                      </div>
                      {token.features.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {token.features.map((feature) => (
                            <span key={feature} className="rounded bg-tint px-1.5 py-0.5 text-[10px] font-semibold text-body">
                              {featureLabel(feature)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[11px] text-soft">Somente o núcleo (sem módulos pagos).</p>
                      )}
                      {canRevoke ? (
                        <ToastForm
                          action={revokeSignupTokenAction}
                          className="mt-3"
                          confirm={`Revogar o token ${token.code}?`}
                        >
                          <input type="hidden" name="id" value={token.id} />
                          <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-danger-line bg-surface px-3 text-xs font-semibold text-danger-dark transition hover:bg-danger-soft">
                            <Ban size={13} aria-hidden="true" />
                            Revogar token
                          </button>
                        </ToastForm>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Clientes ativos</p>
            <h2 className="mt-1 text-lg font-semibold">Empresas usando o sistema</h2>
          </div>

          {companies.map((company) => {
            const lastOrderAt = company.orders[0]?.createdAt ?? null;
            return (
              <article key={company.id} className="rounded-lg border border-line bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{company.name}</h2>
                    <p className="mt-0.5 text-sm text-muted">
                      Cliente desde {formatLongDate(company.createdAt)}
                      {company.email ? ` - ${company.email}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-md bg-tint px-2 py-1 text-body">
                      {company.users.length} {company.users.length === 1 ? "usuário" : "usuários"}
                    </span>
                    <span className="rounded-md bg-tint px-2 py-1 text-body">
                      {company._count.orders} pedidos
                    </span>
                    <span className="rounded-md bg-tint px-2 py-1 text-body">
                      {company._count.clients} clientes
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted">
                  Última atividade: {lastOrderAt ? formatDateTime(lastOrderAt) : "nenhum pedido criado ainda"}
                </p>

                {company.features.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {company.features.map((feature) => (
                      <span key={feature} className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary-dark">
                        {featureLabel(feature)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-soft">Plano só com o núcleo (sem módulos pagos).</p>
                )}

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-primary transition hover:text-primary-dark">
                    Editar plano (módulos)
                  </summary>
                  <ToastForm action={updateCompanyFeaturesAction} className="mt-3 space-y-2">
                    <input type="hidden" name="companyId" value={company.id} />
                    <FeaturePicker
                      defaultSelected={sanitizeFeatures(company.features)}
                      variant="compact"
                    />
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary-dark">
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Salvar plano
                    </button>
                  </ToastForm>
                </details>

                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-semibold text-primary transition hover:text-primary-dark">
                    Ver usuários
                  </summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
                      <thead>
                        <tr className="text-xs text-muted">
                          <th className="border-b border-line pb-2 font-semibold">Nome</th>
                          <th className="border-b border-line pb-2 font-semibold">E-mail</th>
                          <th className="border-b border-line pb-2 font-semibold">Cargo</th>
                          <th className="border-b border-line pb-2 font-semibold">Situação</th>
                          <th className="border-b border-line pb-2 font-semibold">Criado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {company.users.map((member) => (
                          <tr key={member.id}>
                            <td className="border-b border-divider py-2 font-medium">{member.name}</td>
                            <td className="border-b border-divider py-2 text-muted">{member.email}</td>
                            <td className="border-b border-divider py-2 text-muted">{roleLabels[member.role]}</td>
                            <td className="border-b border-divider py-2">
                              {member.active ? (
                                <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-dark">Ativo</span>
                              ) : (
                                <span className="rounded-md bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger-dark">Inativo</span>
                              )}
                            </td>
                            <td className="border-b border-divider py-2 text-muted">{formatLongDate(member.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
