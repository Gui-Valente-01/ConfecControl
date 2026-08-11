import Link from "next/link";
import { LogOut, Plus, Shirt } from "lucide-react";
import { portalLogoutAction } from "@/app/portal/entrar/actions";

// Cabeçalho do portal do cliente (server component; logout via server action).
export function PortalHeader({ companyName, clientName }: { companyName: string; clientName: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-shell/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <Shirt size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-fg">{companyName}</span>
            <span className="block truncate text-xs text-muted">{clientName}</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/portal/solicitar"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            <Plus size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Nova solicitação</span>
            <span className="sm:hidden">Solicitar</span>
          </Link>
          <form action={portalLogoutAction}>
            <button
              className="inline-flex size-10 items-center justify-center rounded-lg border border-line-strong bg-surface text-body transition hover:bg-canvas"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
