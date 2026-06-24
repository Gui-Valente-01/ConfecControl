import Link from "next/link";
import { Factory, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f2ec] px-6 text-[#1d1b16]">
      <div className="w-full max-w-md rounded-lg border border-[#ded7ca] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#1d1b16] text-white">
          <Factory size={24} aria-hidden="true" />
        </div>
        <p className="mt-4 text-5xl font-semibold">404</p>
        <h1 className="mt-2 text-lg font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-[#6f675b]">
          O endereço que você tentou abrir não existe ou foi movido.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#0f8b8d] px-5 text-sm font-semibold text-white"
        >
          <Home size={16} aria-hidden="true" />
          Voltar ao painel
        </Link>
      </div>
    </main>
  );
}
