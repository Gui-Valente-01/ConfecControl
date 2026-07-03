"use client";

import Link from "next/link";
import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-6 text-[#111a16]">
      <div className="w-full max-w-md rounded-lg border border-[#d9e1dd] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#fff0f2] text-[#9f2f42]">
          <TriangleAlert size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-[#66756d]">
          Tente novamente. Se o problema continuar, recarregue a página ou volte ao painel.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#087f7d] px-5 text-sm font-semibold text-white transition hover:bg-[#05605e]"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Tentar de novo
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#c7d3ce] px-5 text-sm font-semibold text-[#405047]"
          >
            <Home size={16} aria-hidden="true" />
            Painel
          </Link>
        </div>
      </div>
    </main>
  );
}
