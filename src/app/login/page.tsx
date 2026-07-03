import Link from "next/link";
import { redirect } from "next/navigation";
import { Factory } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
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
                <p className="text-sm text-[#9eb1a8]">Pedidos, produção e estoque em um só lugar</p>
              </div>
            </div>
            <h1 className="mt-12 max-w-2xl text-5xl font-semibold tracking-normal">
              Controle visual para confecções que vivem de prazo.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#c8d6cf]">
              Acompanhe pedidos, etapas da produção, materiais e pagamentos em telas simples para o dono e para a equipe.
            </p>
            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {["Produção", "Estoque", "Financeiro"].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
                  <p className="text-sm font-semibold">{item}</p>
                  <p className="mt-1 text-xs text-[#9eb1a8]">rotina conectada</p>
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
                <p className="text-sm text-[#63736b]">Gestão de produção</p>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#63736b]">Acesso ao sistema</p>
            <h2 className="mt-1 text-2xl font-semibold">Entrar</h2>
            <LoginForm />
            <details className="mt-4 text-center text-sm text-[#66756d]">
              <summary className="cursor-pointer font-medium text-[#63736b]">Esqueci minha senha</summary>
              <p className="mt-2 leading-6">
                Peça ao dono da sua empresa para redefinir sua senha em <strong>Funcionários - Redefinir</strong>.
                Se você é o dono e perdeu o acesso, entre em contato com o suporte para recuperar a conta.
              </p>
            </details>
            <p className="mt-4 text-center text-sm text-[#66756d]">
              Não tem conta?{" "}
              <Link href="/cadastro" className="font-semibold text-[#087f7d] hover:text-[#05605e]">Criar empresa</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
