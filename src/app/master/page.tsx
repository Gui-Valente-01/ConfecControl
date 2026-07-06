import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Ban, Building2, CheckCircle2, ClipboardList, KeyRound, Plus, Users } from "lucide-react";
import { createSignupTokenAction, revokeSignupTokenAction } from "@/app/master/actions";
import { SubmitButton } from "@/components/submit-button";
import { ToastForm } from "@/components/toast-form";
import { requireUser, roleLabels } from "@/lib/auth";
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
  if (token.revokedAt) return { label: "Revogado", className: "border-[#f1c0c9] bg-[#fff0f2] text-[#9f2f42]" };
  if (token.usedAt) return { label: "Usado", className: "border-[#bfe4dc] bg-[#e8f6f3] text-[#05605e]" };
  return { label: "Disponível", className: "border-[#d9e1dd] bg-[#eef4f1] text-[#405047]" };
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
    <main className="min-h-screen bg-[#f4f6f5] px-4 py-8 text-[#1c2420] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#63736b]">Painel master</p>
            <h1 className="mt-0.5 text-2xl font-semibold">Admin geral do ConfecControl</h1>
            <p className="mt-1 text-sm text-[#63736b]">Gere tokens de cadastro e acompanhe as empresas que entraram.</p>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c7d3ce] bg-white px-4 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar ao painel
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-medium text-[#63736b]">
              <Building2 size={14} aria-hidden="true" />
              Empresas
            </p>
            <p className="mt-1 text-2xl font-semibold">{companies.length}</p>
          </div>
          <div className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-medium text-[#63736b]">
              <Users size={14} aria-hidden="true" />
              Usuários
            </p>
            <p className="mt-1 text-2xl font-semibold">{totalUsers}</p>
          </div>
          <div className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-medium text-[#63736b]">
              <ClipboardList size={14} aria-hidden="true" />
              Pedidos criados
            </p>
            <p className="mt-1 text-2xl font-semibold">{totalOrders}</p>
          </div>
          <div className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-medium text-[#63736b]">
              <KeyRound size={14} aria-hidden="true" />
              Tokens livres
            </p>
            <p className="mt-1 text-2xl font-semibold">{availableTokens}</p>
          </div>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[420px_1fr]">
          <div className="rounded-lg border border-[#d9e1dd] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#63736b]">Novo cliente</p>
            <h2 className="mt-1 text-lg font-semibold">Gerar token de cadastro</h2>
            <p className="mt-1 text-sm leading-6 text-[#66756d]">
              Crie um token, passe a numeração para o cliente e ele usa esse token uma única vez em /cadastro.
            </p>

            <ToastForm action={createSignupTokenAction} className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-[#405047]">Cliente ou empresa</span>
                <input
                  name="clientName"
                  required
                  placeholder="Ex.: Confecção Estrela"
                  className="mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#405047]">E-mail de contato</span>
                <input
                  name="contactEmail"
                  type="email"
                  placeholder="cliente@empresa.com"
                  className="mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                />
              </label>
              <SubmitButton pendingText="Gerando...">
                <Plus size={16} aria-hidden="true" />
                Gerar token
              </SubmitButton>
            </ToastForm>
          </div>

          <div className="rounded-lg border border-[#d9e1dd] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#63736b]">Tokens</p>
                <h2 className="mt-1 text-lg font-semibold">Códigos para novos clientes</h2>
              </div>
              <span className="rounded-md bg-[#eef4f1] px-2 py-1 text-xs font-semibold text-[#405047]">
                {signupTokens.length} recentes
              </span>
            </div>

            {signupTokens.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-6 text-center text-sm text-[#66756d]">
                Nenhum token criado ainda.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {signupTokens.map((token) => {
                  const status = tokenStatus(token);
                  const canRevoke = !token.usedAt && !token.revokedAt;

                  return (
                    <article key={token.id} className="rounded-lg border border-[#d9e1dd] bg-[#f8faf9] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-2xl font-semibold tracking-[0.14em] text-[#111a16]">{token.code}</p>
                          <p className="mt-1 text-sm font-medium">{token.clientName || "Cliente sem nome"}</p>
                          {token.contactEmail ? <p className="text-xs text-[#63736b]">{token.contactEmail}</p> : null}
                        </div>
                        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-[#63736b]">
                        <p>Criado por {token.createdByEmail} em {formatDateTime(token.createdAt)}</p>
                        {token.usedAt ? (
                          <p className="flex items-center gap-1 text-[#05605e]">
                            <CheckCircle2 size={13} aria-hidden="true" />
                            Usado por {token.usedByEmail || "cliente"} em {formatDateTime(token.usedAt)}
                            {token.usedCompany ? ` (${token.usedCompany.name})` : ""}
                          </p>
                        ) : null}
                        {token.revokedAt ? (
                          <p className="flex items-center gap-1 text-[#9f2f42]">
                            <Ban size={13} aria-hidden="true" />
                            Revogado em {formatDateTime(token.revokedAt)}
                          </p>
                        ) : null}
                      </div>
                      {canRevoke ? (
                        <ToastForm
                          action={revokeSignupTokenAction}
                          className="mt-3"
                          confirm={`Revogar o token ${token.code}?`}
                        >
                          <input type="hidden" name="id" value={token.id} />
                          <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#f1c0c9] bg-white px-3 text-xs font-semibold text-[#9f2f42] transition hover:bg-[#fff0f2]">
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
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#63736b]">Clientes ativos</p>
            <h2 className="mt-1 text-lg font-semibold">Empresas usando o sistema</h2>
          </div>

          {companies.map((company) => {
            const lastOrderAt = company.orders[0]?.createdAt ?? null;
            return (
              <article key={company.id} className="rounded-lg border border-[#d9e1dd] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{company.name}</h2>
                    <p className="mt-0.5 text-sm text-[#63736b]">
                      Cliente desde {formatLongDate(company.createdAt)}
                      {company.email ? ` - ${company.email}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-md bg-[#eef4f1] px-2 py-1 text-[#405047]">
                      {company.users.length} {company.users.length === 1 ? "usuário" : "usuários"}
                    </span>
                    <span className="rounded-md bg-[#eef4f1] px-2 py-1 text-[#405047]">
                      {company._count.orders} pedidos
                    </span>
                    <span className="rounded-md bg-[#eef4f1] px-2 py-1 text-[#405047]">
                      {company._count.clients} clientes
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-sm text-[#63736b]">
                  Última atividade: {lastOrderAt ? formatDateTime(lastOrderAt) : "nenhum pedido criado ainda"}
                </p>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#087f7d] transition hover:text-[#05605e]">
                    Ver usuários
                  </summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
                      <thead>
                        <tr className="text-xs text-[#63736b]">
                          <th className="border-b border-[#d9e1dd] pb-2 font-semibold">Nome</th>
                          <th className="border-b border-[#d9e1dd] pb-2 font-semibold">E-mail</th>
                          <th className="border-b border-[#d9e1dd] pb-2 font-semibold">Cargo</th>
                          <th className="border-b border-[#d9e1dd] pb-2 font-semibold">Situação</th>
                          <th className="border-b border-[#d9e1dd] pb-2 font-semibold">Criado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {company.users.map((member) => (
                          <tr key={member.id}>
                            <td className="border-b border-[#edf2ef] py-2 font-medium">{member.name}</td>
                            <td className="border-b border-[#edf2ef] py-2 text-[#63736b]">{member.email}</td>
                            <td className="border-b border-[#edf2ef] py-2 text-[#63736b]">{roleLabels[member.role]}</td>
                            <td className="border-b border-[#edf2ef] py-2">
                              {member.active ? (
                                <span className="rounded-md bg-[#e8f6f3] px-2 py-0.5 text-xs font-semibold text-[#05605e]">Ativo</span>
                              ) : (
                                <span className="rounded-md bg-[#fff0f2] px-2 py-0.5 text-xs font-semibold text-[#9f2f42]">Inativo</span>
                              )}
                            </td>
                            <td className="border-b border-[#edf2ef] py-2 text-[#63736b]">{formatLongDate(member.createdAt)}</td>
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
