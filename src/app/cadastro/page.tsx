import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Factory, MessageCircle } from "lucide-react";
import { SignupForm } from "@/components/signup-form";
import { getSessionUser } from "@/lib/auth";
import { formatPhone, resolveSupportContact } from "@/lib/support";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ativar minha empresa",
  description: "Ative a conta da sua confecção no ConfecControl com o código recebido na contratação.",
  alternates: { canonical: "/cadastro" },
};

const MENSAGEM_CODIGO =
  "Olá! Quero criar a conta da minha confecção no ConfecControl e preciso do código de acesso.";

export default async function CadastroPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  // Quem chega pela busca não sabe que o código é entregue por nós, e o campo
  // pedindo um código que a pessoa não tem é o fim da linha: ela fecha a aba.
  // O contato precisa estar ANTES do formulário, e não numa página de ajuda.
  const suporte = resolveSupportContact(process.env, MENSAGEM_CODIGO);

  return (
    <main className="min-h-screen bg-shell text-fg">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_480px]">
        <section className="hidden items-center bg-ink px-12 py-12 text-white lg:flex">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
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
          <div className="w-full max-w-md">
            <div className="rounded-lg border border-line bg-surface p-6 shadow-[var(--cc-shadow)]">
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-white">
                  <Factory size={22} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xl font-semibold">ConfecControl</p>
                  <p className="text-sm text-muted">Nova empresa</p>
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Ativação</p>
              <h2 className="mt-1 text-2xl font-semibold">Ativar minha empresa</h2>
              <p className="mt-1 text-sm text-muted">
                A ativação acontece depois da contratação, com o código que enviamos.
              </p>

              {/* Vem antes do formulário de propósito: o primeiro campo pede um
                  código, e quem não tem precisa saber como conseguir antes de
                  travar nele. */}
              <div className="mt-5 rounded-lg border border-primary/30 bg-primary-soft p-4">
                <p className="text-sm font-semibold text-primary-dark">Ainda não tem o código de acesso?</p>
                <p className="mt-1 text-sm leading-relaxed text-body">
                  Ele é liberado por nós, na contratação. Chame no WhatsApp que a gente cria o seu
                  e você já cadastra a confecção hoje.
                </p>
                {suporte.whatsappLink ? (
                  <a
                    href={suporte.whatsappLink}
                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
                  >
                    <MessageCircle size={16} aria-hidden="true" />
                    Pedir meu código
                    {suporte.whatsapp ? (
                      <span className="font-normal opacity-90">· {formatPhone(suporte.whatsapp)}</span>
                    ) : null}
                  </a>
                ) : (
                  <Link
                    href="/planos"
                    className="mt-3 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
                  >
                    Ver os planos e falar com a gente
                  </Link>
                )}
              </div>

              <SignupForm />
              <p className="mt-4 text-center text-sm text-muted">
                Já tem conta?{" "}
                <Link href="/login" className="font-semibold text-primary hover:text-primary-dark">Entrar</Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
