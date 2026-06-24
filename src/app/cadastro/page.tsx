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
    <main className="min-h-screen bg-[#f5f2ec] text-[#1d1b16]">
      <div className="grid min-h-screen lg:grid-cols-[1fr_460px]">
        <section className="flex items-center px-6 py-12 md:px-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-[#1d1b16] text-white">
                <Factory size={24} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-semibold">ConfecControl</p>
                <p className="text-sm text-[#766d5d]">Crie a conta da sua confecção</p>
              </div>
            </div>
            <h1 className="mt-12 max-w-2xl text-5xl font-semibold tracking-normal">
              Comece a controlar pedidos e produção em minutos.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#6f675b]">
              Sua empresa tera os proprios clientes, produtos, pedidos, estoque e financeiro - separados de qualquer outra.
            </p>
          </div>
        </section>

        <section className="flex items-center border-l border-[#ded7ca] bg-[#fffaf1] px-6 py-12">
          <div className="w-full rounded-lg border border-[#ded7ca] bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-[#766d5d]">Nova empresa</p>
            <h2 className="mt-1 text-2xl font-semibold">Criar conta</h2>
            <SignupForm />
            <p className="mt-4 text-center text-sm text-[#6f675b]">
              Já tem conta?{" "}
              <Link href="/login" className="font-semibold text-[#0f8b8d]">Entrar</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
