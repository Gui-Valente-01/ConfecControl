import Link from "next/link";
import { LogOut, Plus, Shirt } from "lucide-react";
import { portalLogoutAction } from "@/app/portal/entrar/actions";

// Cabeçalho do portal do cliente (server component; logout via server action).
export function PortalHeader({ companyName, clientName }: { companyName: string; clientName: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#d9e1dd] bg-[#f4f6f5]/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#087f7d] text-white">
            <Shirt size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#1c2420]">{companyName}</span>
            <span className="block truncate text-xs text-[#63736b]">{clientName}</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/portal/solicitar"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#087f7d] px-3.5 text-sm font-semibold text-white transition hover:bg-[#05605e]"
          >
            <Plus size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Nova solicitação</span>
            <span className="sm:hidden">Solicitar</span>
          </Link>
          <form action={portalLogoutAction}>
            <button
              className="inline-flex size-10 items-center justify-center rounded-lg border border-[#c7d3ce] bg-white text-[#405047] transition hover:bg-[#f8faf9]"
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
