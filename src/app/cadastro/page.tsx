import Link from "next/link";
import { redirect } from "next/navigation";
import { Factory } from "lucide-react";
import { SignupForm } from "@/components/signup-form";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CadastroPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <main className="min-h-screen bg-[#f4f6f5] text-[#1c2420]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_480px]">
        <section className="hidden items-center bg-[#111a16] px-12 py-12 text-white lg:flex">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-[#087f7d] text-white shadow-sm">
                <Factory size={24} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-semibold">ConfecControl</p>
                <p className="text-sm text-[#9eb1a8]">Crie a conta da sua confecção</p>
              </div>
            </div>
            <h1 className="mt-12 max-w-2xl text-5xl font-semibold tracking-normal">
              Comece a controlar pedidos e produção em minutos.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#c8d6cf]">
              Sua empresa terá os próprios clientes, produtos, pedidos, estoque e financeiro, separados de qualquer outra.
            </p>
            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {["Clientes", "Pedidos", "Estoque"].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
                  <p className="text-sm font-semibold">{item}</p>
                  <p className="mt-1 text-xs text-[#9eb1a8]">base inicial</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-lg border border-[#d9e1dd] bg-white p-6 shadow-[var(--cc-shadow)]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex size-11 items-center justify-center rounded-lg bg-[#087f7d] text-white">
                <Factory size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xl font-semibold">ConfecControl</p>
                <p className="text-sm text-[#63736b]">Nova empresa</p>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#63736b]">Nova empresa</p>
            <h2 className="mt-1 text-2xl font-semibold">Criar conta</h2>
            <SignupForm />
            <p className="mt-4 text-center text-sm text-[#66756d]">
              Já tem conta?{" "}
              <Link href="/login" className="font-semibold text-[#087f7d] hover:text-[#05605e]">Entrar</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
