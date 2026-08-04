import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Factory, Mail, MessageCircle } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/auth";
import { formatPhone, resolveSupportContact } from "@/lib/support";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  // Quem está travado no login não consegue abrir nada dentro do sistema:
  // o manual e o contato precisam estar nesta tela.
  const suporte = resolveSupportContact(process.env);

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
                {suporte.hasAny
                  ? " Se você é o dono e perdeu o acesso, fale com o suporte pelos contatos abaixo."
                  : " Se você é o dono e perdeu o acesso, fale com quem instalou o sistema para você."}
              </p>
            </details>
            <p className="mt-4 rounded-lg bg-[#f8faf9] px-3 py-2.5 text-center text-sm leading-6 text-[#66756d]">
              <strong className="font-semibold text-[#405047]">Funcionário:</strong> seu acesso é criado pelo dono da
              confecção. Peça a ele seu e-mail e senha de entrada.
            </p>
            <p className="mt-3 text-center text-sm text-[#66756d]">
              É dono e recebeu o código de acesso?{" "}
              <Link href="/cadastro" className="font-semibold text-[#087f7d] hover:text-[#05605e]">Criar empresa</Link>
            </p>

            <div className="mt-5 border-t border-[#e6ebe8] pt-4">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9890]">Precisa de ajuda?</p>
              <div className="mt-3 grid gap-2">
                <a
                  href="/manual"
                  target="_blank"
                  rel="noopener"
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c7d3ce] bg-white px-3 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]"
                >
                  <BookOpen size={15} aria-hidden="true" />
                  Manual do sistema
                </a>
                {suporte.whatsappLink ? (
                  <a
                    href={suporte.whatsappLink}
                    target="_blank"
                    rel="noopener"
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#bfe0d9] bg-[#e8f6f3] px-3 text-sm font-semibold text-[#05605e] transition hover:bg-[#d9efe9]"
                  >
                    <MessageCircle size={15} aria-hidden="true" />
                    Suporte no WhatsApp
                    <span className="font-normal text-[#3f7d78]">{formatPhone(suporte.whatsapp ?? "")}</span>
                  </a>
                ) : null}
                {suporte.email ? (
                  // E-mail é um texto sem espaço: não quebra sozinho e, num
                  // aparelho de 320px, empurrava a tela de login inteira para o
                  // lado. Com break-all ele passa para a linha de baixo, e a
                  // altura deixa de ser fixa para caber nas duas linhas.
                  <a
                    href={`mailto:${suporte.email}?subject=${encodeURIComponent("Ajuda com o acesso ao ConfecControl")}`}
                    className="flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-[#c7d3ce] bg-white px-3 py-2 text-sm font-medium text-[#405047] transition hover:bg-[#f8faf9]"
                  >
                    <Mail size={15} className="shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-all text-center">{suporte.email}</span>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
