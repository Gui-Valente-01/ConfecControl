"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BarChart3,
  ClipboardList,
  CreditCard,
  Factory,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Shirt,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@prisma/client";
import { logoutAction } from "@/app/login/actions";
import { canAccessRoute, roleLabels } from "@/lib/roles";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Produtos", href: "/produtos", icon: Shirt },
  { label: "Pedidos", href: "/pedidos", icon: ClipboardList },
  { label: "Produção", href: "/producao", icon: Factory },
  { label: "Estoque", href: "/estoque", icon: Package },
  { label: "Financeiro", href: "/financeiro", icon: CreditCard },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Funcionários", href: "/usuarios", icon: ShieldCheck },
  { label: "Terceirizadas", href: "/terceirizadas", icon: Handshake },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

type ShellUser = {
  name: string;
  role: UserRole;
  companyName: string;
};

type AppShellProps = {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  user: ShellUser;
  children: React.ReactNode;
};

export function AppShell({ eyebrow, title, user, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNav = navItems.filter((item) => canAccessRoute(user.role, item.href));

  return (
    <main className="min-h-screen bg-[#f5f2ec] text-[#1d1b16]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[#ded7ca] bg-[#fffaf1] px-5 py-6 lg:block">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[#1d1b16] text-white">
              <Factory size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl font-semibold">ConfecControl</p>
              <p className="text-sm text-[#766d5d]">Gestão de produção</p>
            </div>
          </Link>

          <nav className="mt-8 space-y-1" aria-label="Navegacao principal">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                    active
                      ? "bg-[#1d1b16] text-white"
                      : "text-[#544d43] hover:bg-[#f0e7d8] hover:text-[#1d1b16]"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 rounded-lg border border-[#ded7ca] bg-white p-4">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="mt-0.5 text-xs text-[#6f675b]">{roleLabels[user.role]} - {user.companyName}</p>
            <Link href="/conta" className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#d8cfbf] bg-white text-sm font-semibold text-[#544d43] transition hover:bg-[#f0e7d8]">
              <UserRound size={16} aria-hidden="true" />
              Minha conta
            </Link>
            <form action={logoutAction} className="mt-2">
              <button className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#d8cfbf] bg-white text-sm font-semibold text-[#544d43] transition hover:bg-[#f0e7d8]">
                <LogOut size={16} aria-hidden="true" />
                Sair
              </button>
            </form>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-[#ded7ca] bg-[#f5f2ec]/95 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 lg:hidden">
                <button
                  className="flex size-10 items-center justify-center rounded-lg border border-[#d8cfbf] bg-white text-[#1d1b16]"
                  aria-label="Abrir menu"
                  title="Abrir menu"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu size={20} aria-hidden="true" />
                </button>
                <div>
                  <p className="font-semibold">ConfecControl</p>
                  <p className="text-xs text-[#766d5d]">Painel inicial</p>
                </div>
              </div>

              <div className="hidden md:block">
                <p className="text-sm font-medium text-[#766d5d]">{eyebrow}</p>
                <h1 className="text-2xl font-semibold tracking-normal text-[#1d1b16]">{title}</h1>
              </div>

              <div className="flex flex-1 items-center justify-end gap-2">
                <form method="get" action="/busca" className="relative hidden min-w-64 max-w-sm flex-1 md:block">
                  <span className="sr-only">Buscar</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#766d5d]"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    name="q"
                    className="h-10 w-full rounded-lg border border-[#d8cfbf] bg-white pl-10 pr-3 text-sm outline-none ring-[#0f8b8d]/20 placeholder:text-[#9a9285] focus:ring-4"
                    placeholder="Buscar pedido, cliente ou produto"
                  />
                </form>
                {canAccessRoute(user.role, "/relatorios") ? (
                  <Link
                    href="/relatorios"
                    className="flex size-10 items-center justify-center rounded-lg border border-[#d8cfbf] bg-white text-[#1d1b16]"
                    aria-label="Ver alertas e relatórios"
                    title="Alertas e relatórios"
                  >
                    <Bell size={18} aria-hidden="true" />
                  </Link>
                ) : null}
                {pathname !== "/pedidos" ? (
                  <Link href="/pedidos" className="flex h-10 items-center gap-2 rounded-lg bg-[#0f8b8d] px-4 text-sm font-semibold text-white shadow-sm">
                    <Plus size={17} aria-hidden="true" />
                    <span>Novo pedido</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </header>

          <div className="space-y-8 px-4 py-6 md:px-8">{children}</div>
        </section>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-[#1d1b16]/30 lg:hidden" role="presentation">
          <aside className="h-full w-80 max-w-[88vw] border-r border-[#ded7ca] bg-[#fffaf1] px-5 py-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#1d1b16] text-white">
                  <Factory size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold">ConfecControl</p>
                  <p className="text-xs text-[#766d5d]">Menu</p>
                </div>
              </Link>
              <button
                className="flex size-10 items-center justify-center rounded-lg border border-[#d8cfbf] bg-white"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                title="Fechar menu"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <nav className="mt-8 space-y-1" aria-label="Navegacao mobile">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                      active ? "bg-[#1d1b16] text-white" : "text-[#544d43] hover:bg-[#f0e7d8]"
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-8 rounded-lg border border-[#ded7ca] bg-white p-3">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="mt-0.5 text-xs text-[#6f675b]">{roleLabels[user.role]} - {user.companyName}</p>
              <Link href="/conta" onClick={() => setMobileOpen(false)} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d8cfbf] bg-white text-sm font-semibold text-[#544d43]">
                <UserRound size={16} aria-hidden="true" />
                Minha conta
              </Link>
              <form action={logoutAction} className="mt-2">
                <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d8cfbf] bg-white text-sm font-semibold text-[#544d43]">
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
