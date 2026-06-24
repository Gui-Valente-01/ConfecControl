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
                <p className="text-sm text-[#766d5d]">Pedidos, produção e estoque em um so lugar</p>
              </div>
            </div>
            <h1 className="mt-12 max-w-2xl text-5xl font-semibold tracking-normal">
              Controle visual para confecções que vivem de prazo.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#6f675b]">
              Acompanhe pedidos, etapas da produção, materiais e pagamentos em telas simples para o dono e para a equipe.
            </p>
          </div>
        </section>

        <section className="flex items-center border-l border-[#ded7ca] bg-[#fffaf1] px-6 py-12">
          <div className="w-full rounded-lg border border-[#ded7ca] bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-[#766d5d]">Acesso ao sistema</p>
            <h2 className="mt-1 text-2xl font-semibold">Entrar</h2>
            <LoginForm />
            <details className="mt-4 text-center text-sm text-[#6f675b]">
              <summary className="cursor-pointer font-medium text-[#766d5d]">Esqueci minha senha</summary>
              <p className="mt-2 leading-6">
                Peça ao dono da sua empresa para redefinir sua senha em <strong>Funcionários → Redefinir</strong>.
                Se você é o dono e perdeu o acesso, entre em contato com o suporte para recuperar a conta.
              </p>
            </details>
            <p className="mt-4 text-center text-sm text-[#6f675b]">
              Não tem conta?{" "}
              <Link href="/cadastro" className="font-semibold text-[#0f8b8d]">Criar empresa</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
