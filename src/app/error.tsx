"use client";

import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Esta é a tela que a pessoa vê quando algo quebra. Sem o aviso daqui, o
    // erro morre no aparelho dela e a única pista que sobra é o telefonema.
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-shell px-6 text-ink">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-danger-soft text-danger-dark">
          <TriangleAlert size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted">
          Tente novamente. Se o problema continuar, recarregue a página ou volte ao painel.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Tentar de novo
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-line-strong px-5 text-sm font-semibold text-body"
          >
            <Home size={16} aria-hidden="true" />
            Painel
          </Link>
        </div>
      </div>
    </main>
  );
}
