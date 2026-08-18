import type { Metadata } from "next";
import Link from "next/link";
import { Factory } from "lucide-react";

// Página de endereço inexistente.
//
// Antes, qualquer endereço errado caía na tela de login — o que confunde
// (parece que a pessoa foi deslogada) e, para o Google, faz um erro parecer uma
// página válida. Agora ela diz o que aconteceu e oferece as saídas.

export const metadata: Metadata = {
  title: "Página não encontrada",
  // Erro não entra em índice de busca.
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-shell px-6 py-16 text-fg">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary text-white">
          <Factory size={24} aria-hidden="true" />
        </span>
        <p className="mt-6 font-mono text-sm font-semibold text-muted">Erro 404</p>
        <h1 className="mt-2 text-2xl font-semibold">Esta página não existe.</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          O endereço pode ter mudado, ou o link que você seguiu está errado.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Ir para o início
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-semibold text-body transition hover:bg-canvas"
          >
            Entrar no sistema
          </Link>
        </div>
      </div>
    </main>
  );
}
