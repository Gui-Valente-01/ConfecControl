"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BarChart3,
  BookOpen,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Factory,
  Handshake,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Shirt,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@prisma/client";
import { logoutAction } from "@/app/login/actions";
import { planAllowsRoute } from "@/lib/features";
import { canAccessRoute, canManageOrders, roleLabels } from "@/lib/roles";

// O menu usa a mesma palavra que o resto do sistema. "Dashboard" era a única
// palavra em inglês no produto inteiro, e "Produtos" brigava com "peça", que é
// como todas as outras telas chamam o item do catálogo. As rotas continuam as
// mesmas: mudar endereço quebraria link salvo e favorito de quem já usa.
//
// Eram 14 itens soltos, todos com o mesmo peso. Para quem nunca usou um sistema
// de gestão, 14 escolhas é o mesmo que nenhuma pista. Agora ficam em cima só as
// seis telas do dia a dia; o resto é cadastro e ajuste, que se mexe de vez em
// quando, e vai para "Mais".
const navPrincipal = [
  { label: "Início", href: "/", icon: LayoutDashboard },
  { label: "Pedidos", href: "/pedidos", icon: ClipboardList },
  { label: "Produção", href: "/producao", icon: Factory },
  { label: "Financeiro", href: "/financeiro", icon: CreditCard },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Solicitações", href: "/solicitacoes", icon: Inbox },
];

const navMais = [
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Peças", href: "/produtos", icon: Shirt },
  { label: "Materiais", href: "/estoque", icon: Package },
  { label: "Terceirizadas", href: "/terceirizadas", icon: Handshake },
  { label: "Funcionários", href: "/usuarios", icon: ShieldCheck },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
  { label: "Lixeira", href: "/lixeira", icon: Trash2 },
];

// A Bancada é uma atividade da produção, não um módulo à parte: aparece dentro
// de Produção, e o menu mostra as duas como uma coisa só.
const SUBROTAS: Record<string, { label: string; href: string; icon: typeof LayoutGrid }[]> = {
  "/producao": [{ label: "Bancada", href: "/bancada", icon: LayoutGrid }],
};

type ShellUser = {
  name: string;
  role: UserRole;
  companyName: string;
  features: string[];
};

type AppShellProps = {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
  search?:
    | false
    | {
        action?: string;
        placeholder?: string;
        ariaLabel?: string;
        defaultValue?: string;
        showOnMobile?: boolean;
      };
  user: ShellUser;
  children: React.ReactNode;
};

export function AppShell({
  eyebrow,
  title,
  actionLabel,
  actionHref,
  search,
  user,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const podeVer = (href: string) =>
    canAccessRoute(user.role, href) && planAllowsRoute(user.features, href);

  const principal = navPrincipal.filter((item) => podeVer(item.href));
  const mais = navMais.filter((item) => podeVer(item.href));

  // "Mais" começa aberto quando a pessoa já está numa das telas de dentro:
  // fechado ali, o menu esconderia justamente a página em que ela está.
  const emMais = mais.some((item) => pathname.startsWith(item.href) && item.href !== "/");
  const [maisAberto, setMaisAberto] = useState(emMais);

  const estaAtivo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Um só renderizador para o menu do computador e o do celular: dois códigos
  // separados foi como o "Dashboard" e o "Painel" acabaram com nomes diferentes.
  const renderNav = (aoNavegar?: () => void, alturaItem = "h-10") => (
    <>
      {principal.map((item) => {
        const Icon = item.icon;
        const ativo = estaAtivo(item.href);
        const subrotas = (SUBROTAS[item.href] ?? []).filter((sub) => podeVer(sub.href));
        const algumaSubAtiva = subrotas.some((sub) => estaAtivo(sub.href));
        return (
          <div key={item.href}>
            <Link
              href={item.href}
              onClick={aoNavegar}
              aria-current={ativo ? "page" : undefined}
              className={`flex ${alturaItem} items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                ativo || algumaSubAtiva
                  ? "bg-white text-[#111a16] shadow-sm"
                  : "text-[#c8d6cf] hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} aria-hidden="true" />
              {item.label}
            </Link>
            {subrotas.map((sub) => {
              const SubIcon = sub.icon;
              const subAtiva = estaAtivo(sub.href);
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  onClick={aoNavegar}
                  aria-current={subAtiva ? "page" : undefined}
                  className={`ml-5 flex ${alturaItem} items-center gap-2.5 rounded-lg border-l border-white/15 pl-4 pr-3 text-sm transition ${
                    subAtiva ? "bg-white/90 font-semibold text-[#111a16]" : "text-[#9eb1a8] hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <SubIcon size={16} aria-hidden="true" />
                  {sub.label}
                </Link>
              );
            })}
          </div>
        );
      })}

      {mais.length > 0 ? (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setMaisAberto((aberto) => !aberto)}
            aria-expanded={maisAberto}
            className={`flex ${alturaItem} w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#c8d6cf] transition hover:bg-white/10 hover:text-white`}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
            <span className="flex-1 text-left">Mais</span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`transition-transform ${maisAberto ? "rotate-180" : ""}`}
            />
          </button>

          {maisAberto ? (
            <div className="mt-1 space-y-1">
              {mais.map((item) => {
                const Icon = item.icon;
                const ativo = estaAtivo(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={aoNavegar}
                    aria-current={ativo ? "page" : undefined}
                    className={`ml-5 flex ${alturaItem} items-center gap-2.5 rounded-lg border-l border-white/15 pl-4 pr-3 text-sm transition ${
                      ativo ? "bg-white font-semibold text-[#111a16]" : "text-[#9eb1a8] hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
              <a
                href="/manual"
                target="_blank"
                rel="noopener"
                onClick={aoNavegar}
                className={`ml-5 flex ${alturaItem} items-center gap-2.5 rounded-lg border-l border-white/15 pl-4 pr-3 text-sm text-[#9eb1a8] transition hover:bg-white/10 hover:text-white`}
              >
                <BookOpen size={16} aria-hidden="true" />
                Manual
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
  const resolvedSearch =
    search === false
      ? null
      : {
          action: search?.action ?? "/busca",
          placeholder: search?.placeholder ?? "Buscar pedido, cliente ou produto",
          ariaLabel: search?.ariaLabel ?? "Buscar pedido, cliente ou produto",
          defaultValue: search?.defaultValue,
          showOnMobile: search?.showOnMobile ?? false,
        };
  const headerAction =
    actionLabel && actionHref
      ? { label: actionLabel, href: actionHref }
      : canManageOrders(user.role) && pathname !== "/pedidos"
        ? { label: "Novo pedido", href: "/pedidos" }
        : null;

  return (
    <main className="min-h-screen bg-[#f4f6f5] text-[#1c2420]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-[#24342c] bg-[#111a16] px-5 py-5 text-white lg:flex">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[#087f7d] text-white shadow-sm">
              <Factory size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl font-semibold">ConfecControl</p>
              <p className="text-sm text-[#9eb1a8]">Gestão de produção</p>
            </div>
          </Link>

          <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Navegação principal">
            {renderNav()}
          </nav>

          <div className="mt-5 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="mt-0.5 text-xs text-[#9eb1a8]">
              {roleLabels[user.role]} - {user.companyName}
            </p>
            <Link
              href="/conta"
              className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <UserRound size={16} aria-hidden="true" />
              Minha conta
            </Link>
            {/* Arquivo estático fora do roteador do Next: precisa de <a>, não de <Link>. */}
            <a
              href="/manual"
              target="_blank"
              rel="noopener"
              className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent text-sm font-semibold text-[#c8d6cf] transition hover:bg-white/10 hover:text-white"
            >
              <BookOpen size={16} aria-hidden="true" />
              Manual de uso
            </a>
            <form action={logoutAction} className="mt-2">
              <button className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent text-sm font-semibold text-[#c8d6cf] transition hover:bg-white/10 hover:text-white">
                <LogOut size={16} aria-hidden="true" />
                Sair
              </button>
            </form>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-[#d9e1dd] bg-[#f4f6f5]/90 px-4 py-3.5 backdrop-blur md:px-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#d9e1dd] bg-white text-[#1c2420] shadow-sm lg:hidden"
                  aria-label="Abrir menu"
                  title="Abrir menu"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu size={20} aria-hidden="true" />
                </button>
                <div className="min-w-0">
                  <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-[#63736b] md:block">
                    {eyebrow}
                  </p>
                  <h1 className="truncate text-base font-semibold text-[#1c2420] md:mt-0.5 md:text-2xl">
                    {title}
                  </h1>
                </div>
              </div>

              <div className="flex min-w-0 items-center justify-end gap-2">
                {resolvedSearch ? (
                  <form
                    method="get"
                    action={resolvedSearch.action}
                    className="relative hidden w-48 shrink-0 md:block lg:w-56 xl:w-72"
                  >
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#63736b]"
                      size={18}
                      aria-hidden="true"
                    />
                    <input
                      name="q"
                      aria-label={resolvedSearch.ariaLabel}
                      defaultValue={resolvedSearch.defaultValue}
                      className="h-10 w-full rounded-lg border border-[#d9e1dd] bg-white pl-10 pr-3 text-sm outline-none ring-[#087f7d]/20 placeholder:text-[#63736b] shadow-sm transition focus:border-[#087f7d] focus:ring-4"
                      placeholder={resolvedSearch.placeholder}
                    />
                  </form>
                ) : null}
                {canAccessRoute(user.role, "/relatorios") && planAllowsRoute(user.features, "/relatorios") ? (
                  <Link
                    href="/relatorios"
                    className="flex size-10 items-center justify-center rounded-lg border border-[#d9e1dd] bg-white text-[#1c2420] shadow-sm transition hover:border-[#c7d3ce] hover:bg-[#f8faf9]"
                    aria-label="Ver alertas e relatórios"
                    title="Alertas e relatórios"
                  >
                    <Bell size={18} aria-hidden="true" />
                  </Link>
                ) : null}
                {headerAction ? (
                  <Link
                    href={headerAction.href}
                    aria-label={headerAction.label}
                    title={headerAction.label}
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#05605e] text-sm font-semibold text-white shadow-sm transition hover:bg-[#044d4c] sm:h-10 sm:w-auto sm:gap-2 sm:px-4"
                  >
                    <Plus size={17} aria-hidden="true" />
                    <span className="hidden whitespace-nowrap sm:inline">{headerAction.label}</span>
                  </Link>
                ) : null}
              </div>
            </div>

            {resolvedSearch?.showOnMobile ? (
              <form method="get" action={resolvedSearch.action} className="relative mt-3 md:hidden">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#63736b]"
                  size={18}
                  aria-hidden="true"
                />
                <input
                  name="q"
                  aria-label={resolvedSearch.ariaLabel}
                  defaultValue={resolvedSearch.defaultValue}
                  className="h-10 w-full rounded-lg border border-[#d9e1dd] bg-white pl-10 pr-3 text-sm outline-none ring-[#087f7d]/20 placeholder:text-[#63736b] shadow-sm transition focus:border-[#087f7d] focus:ring-4"
                  placeholder={resolvedSearch.placeholder}
                />
              </form>
            ) : null}
          </header>

          <div className="space-y-8 px-4 py-6 md:px-8 xl:px-10">{children}</div>
        </section>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-[#111a16]/45 lg:hidden" role="presentation">
          <aside className="flex h-full w-80 max-w-[88vw] flex-col overflow-hidden border-r border-[#24342c] bg-[#111a16] px-5 py-6 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#087f7d] text-white">
                  <Factory size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold">ConfecControl</p>
                  <p className="text-xs text-[#9eb1a8]">Menu</p>
                </div>
              </Link>
              <button
                className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                title="Fechar menu"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {/* Fecha sozinho ao escolher uma página: no celular, menu que fica
                aberto por cima do conteúdo faz a pessoa achar que não navegou. */}
            <nav className="mt-8 min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Navegação mobile">
              {renderNav(() => setMobileOpen(false), "h-11")}
            </nav>
            <div className="mt-5 shrink-0 rounded-xl border border-white/10 bg-white/[0.06] p-3">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="mt-0.5 text-xs text-[#9eb1a8]">
                {roleLabels[user.role]} - {user.companyName}
              </p>
              <Link
                href="/conta"
                onClick={() => setMobileOpen(false)}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 text-sm font-semibold text-white"
              >
                <UserRound size={16} aria-hidden="true" />
                Minha conta
              </Link>
              <a
                href="/manual"
                target="_blank"
                rel="noopener"
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent text-sm font-semibold text-[#c8d6cf]"
              >
                <BookOpen size={16} aria-hidden="true" />
                Manual de uso
              </a>
              <form action={logoutAction} className="mt-2">
                <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent text-sm font-semibold text-[#c8d6cf]">
                  <LogOut size={16} aria-hidden="true" />
                  Sair
                </button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
