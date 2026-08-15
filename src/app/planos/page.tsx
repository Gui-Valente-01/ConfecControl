import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Mail, MessageCircle, Minus } from "lucide-react";
import { BotaoDemo } from "@/components/landing/botao-demo";
import { LandingFooter, LandingHeader } from "@/components/landing/landing-chrome";
import { Reveal } from "@/components/landing/reveal";
import { getSessionUser } from "@/lib/auth";
import { featurePresets, sellableFeatures } from "@/lib/features";
import { formatPhone, resolveSupportContact } from "@/lib/support";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planos",
  description:
    "Os planos do ConfecControl para ateliê, facção, estamparia e marca própria. Monte o sistema com os módulos que a sua confecção usa.",
  alternates: { canonical: "/planos" },
};

// O que toda confecção recebe, em qualquer plano. Está no código como comentário
// desde sempre (src/lib/features.ts); aqui ele vira informação para quem compra.
const NUCLEO = [
  "Cadastro de clientes",
  "Cadastro de peças e serviços",
  "Pedidos com prazo e responsável",
  "Painel com o que atrasou",
  "Busca em tudo",
  "Lixeira com recuperação",
];

const MENSAGEM_CONTATO = "Olá! Vi os planos no site e quero saber mais sobre o ConfecControl para a minha confecção.";

export default async function PlanosPage() {
  // Quem já é cliente não precisa da página de vendas: cai no próprio painel.
  const user = await getSessionUser();
  if (user) redirect("/");

  const suporte = resolveSupportContact(process.env, MENSAGEM_CONTATO);

  return (
    <div className="bg-shell text-fg">
      <LandingHeader base="/" />

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:px-8 lg:pt-20">
          <Reveal>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
              Você paga pelo que a sua confecção usa.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Um ateliê que costura sob medida não precisa do mesmo sistema que uma estamparia com
              cinco funcionários na bancada. Os planos abaixo são pontos de partida — dá para
              incluir ou tirar qualquer módulo depois.
            </p>
          </Reveal>
        </section>

        {/* Planos */}
        <section className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
          <div className="grid gap-5 lg:grid-cols-3">
            {featurePresets.map((preset, i) => {
              // O do meio é o de quem mais procura o sistema: produção com
              // bancada. Fica em destaque para não deixar o visitante decidir no
              // escuro entre três caixas iguais.
              const destaque = preset.key === "producao";
              const modulos = sellableFeatures.filter((f) => preset.features.includes(f.key));
              const ausentes = sellableFeatures.filter((f) => !preset.features.includes(f.key));

              return (
                <Reveal key={preset.key} delay={i * 80}>
                  <article
                    className={`flex h-full flex-col rounded-2xl border p-6 ${
                      destaque
                        ? "border-primary bg-surface shadow-[var(--cc-shadow)]"
                        : "border-line bg-canvas"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold">{preset.label}</h2>
                        <p className="mt-1 text-sm text-muted">{preset.who}</p>
                      </div>
                      {destaque ? (
                        <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-dark">
                          Mais procurado
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 border-t border-line pt-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-soft">
                        Além do essencial
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        {modulos.length === 0 ? (
                          <li className="text-sm text-muted">
                            Só o essencial: clientes, peças, pedidos e o painel de prazos.
                          </li>
                        ) : (
                          modulos.map((modulo) => (
                            <li key={modulo.key} className="flex gap-2.5 text-sm">
                              <Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                              <span>
                                <span className="font-medium text-body">{modulo.label}</span>
                                <span className="block text-xs leading-relaxed text-soft">{modulo.description}</span>
                              </span>
                            </li>
                          ))
                        )}
                      </ul>

                      {ausentes.length > 0 ? (
                        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
                          {ausentes.map((modulo) => (
                            <li key={modulo.key} className="flex items-center gap-2.5 text-sm text-soft">
                              <Minus size={14} className="shrink-0" aria-hidden="true" />
                              {modulo.label}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="mt-6 flex-1" />

                    <a
                      href={suporte.whatsappLink ?? "/cadastro"}
                      className={`inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition ${
                        destaque
                          ? "bg-primary text-white hover:bg-primary-dark"
                          : "border border-line-strong bg-surface text-body hover:bg-canvas"
                      }`}
                    >
                      Falar sobre este plano
                    </a>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-sm text-muted">
              O valor depende do tamanho da operação e dos módulos escolhidos. Fale com a gente e
              recebe a proposta da sua confecção — sem formulário e sem esperar retorno de vendedor.
            </p>
            <BotaoDemo />
          </div>
        </section>

        {/* O núcleo */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
                Isto vem em todos os planos.
              </h2>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-muted">
                Não existe plano em que o básico da confecção fique de fora. O que muda de um para
                outro é o que roda em volta: produção, bancada, estoque, portal.
              </p>
            </Reveal>
            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {NUCLEO.map((item, i) => (
                <Reveal key={item} delay={i * 40}>
                  <li className="flex items-center gap-2.5 rounded-lg border border-line bg-canvas px-4 py-3 text-sm font-medium text-body">
                    <Check size={16} className="shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Contato */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
                Conte como a sua confecção trabalha hoje.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-[#9eb1a8]">
                Quantos pedidos por mês, quantas pessoas na produção, o que hoje é caderno e o que
                é WhatsApp. Com isso dá para dizer qual plano serve — e se não servir nenhum, a
                gente fala isso também.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {suporte.whatsappLink ? (
                  <a
                    href={suporte.whatsappLink}
                    className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-white transition hover:bg-primary-dark"
                  >
                    <MessageCircle size={18} aria-hidden="true" />
                    WhatsApp {suporte.whatsapp ? formatPhone(suporte.whatsapp) : ""}
                  </a>
                ) : null}
                {suporte.email ? (
                  <a
                    href={`mailto:${suporte.email}?subject=${encodeURIComponent("Planos do ConfecControl")}`}
                    className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/20 px-6 text-base font-semibold text-white transition hover:bg-white/10"
                  >
                    <Mail size={18} aria-hidden="true" />
                    {suporte.email}
                  </a>
                ) : null}
                {/* Sem contato configurado a página não pode virar beco sem
                    saída: o cadastro continua aberto para quem já tem código. */}
                {!suporte.hasAny ? (
                  <Link
                    href="/cadastro"
                    className="inline-flex h-12 items-center rounded-lg bg-primary px-6 text-base font-semibold text-white transition hover:bg-primary-dark"
                  >
                    Criar minha conta
                  </Link>
                ) : null}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
