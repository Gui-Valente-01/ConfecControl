"use client";

import Link from "next/link";
import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f2ec] px-6 text-[#1d1b16]">
      <div className="w-full max-w-md rounded-lg border border-[#ded7ca] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#fdecef] text-[#b23647]">
          <TriangleAlert size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-[#6f675b]">
          Tente novamente. Se o problema continuar, recarregue a página ou volte ao painel.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1d1b16] px-5 text-sm font-semibold text-white"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Tentar de novo
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d8cfbf] px-5 text-sm font-semibold text-[#544d43]"
          >
            <Home size={16} aria-hidden="true" />
            Painel
          </Link>
        </div>
      </div>
    </main>
  );
}
