import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, ClipboardList, Users } from "lucide-react";
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

export default async function MasterPage() {
  const user = await requireUser();
  if (!superAdminEmails().includes(user.email.toLowerCase())) redirect("/");

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      },
      orders: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      _count: { select: { orders: true, clients: true } },
    },
  });

  const totalUsers = companies.reduce((sum, company) => sum + company.users.length, 0);
  const totalOrders = companies.reduce((sum, company) => sum + company._count.orders, 0);

  return (
    <main className="min-h-screen bg-[#f4f6f5] px-4 py-8 text-[#1c2420] md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#63736b]">Painel master</p>
            <h1 className="mt-0.5 text-2xl font-semibold">Quem está usando o ConfecControl</h1>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c7d3ce] bg-white px-4 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar ao painel
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
        </div>

        <div className="mt-6 space-y-4">
          {companies.map((company) => {
            const lastOrderAt = company.orders[0]?.createdAt ?? null;
            return (
              <article key={company.id} className="rounded-lg border border-[#d9e1dd] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{company.name}</h2>
                    <p className="mt-0.5 text-sm text-[#63736b]">
                      Cliente desde {formatLongDate(company.createdAt)}
                      {company.email ? ` · ${company.email}` : ""}
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
                        <tr className="text-xs text-[#766d5d]">
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
                                <span className="rounded-md bg-[#e8f6f3] px-2 py-0.5 text-xs font-semibold text-[#0f696b]">Ativo</span>
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
        </div>
      </div>
    </main>
  );
}
