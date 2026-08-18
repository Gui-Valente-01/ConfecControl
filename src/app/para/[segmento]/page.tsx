import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { LandingFooter, LandingHeader, PrimaryCta } from "@/components/landing/landing-chrome";
import { Reveal } from "@/components/landing/reveal";
import { sellableFeatures } from "@/lib/features";
import { acharSegmento, segmentos } from "@/lib/segmentos";

type Params = Promise<{ segmento: string }>;

// As três páginas são geradas no build: não consultam banco e mudam pouco.
// Página estática abre mais rápido, e velocidade conta na busca.
export function generateStaticParams() {
  return segmentos.map((s) => ({ segmento: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { segmento: slug } = await params;
  const segmento = acharSegmento(slug);
  if (!segmento) return {};

  return {
    title: segmento.metaTitulo,
    description: segmento.metaDescricao,
    alternates: { canonical: `/para/${segmento.slug}` },
    openGraph: {
      title: `${segmento.metaTitulo} — ConfecControl`,
      description: segmento.metaDescricao,
      url: `/para/${segmento.slug}`,
    },
  };
}

export default async function SegmentoPage({ params }: { params: Params }) {
  const { segmento: slug } = await params;
  const segmento = acharSegmento(slug);
  if (!segmento) notFound();

  const recursos = sellableFeatures.filter((f) => segmento.recursos.includes(f.key));
  const outros = segmentos.filter((s) => s.slug !== segmento.slug);

  return (
    <div className="bg-shell text-fg">
      <LandingHeader base="/" />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:px-8 lg:pt-20">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-dark">
              {segmento.nome}
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
              {segmento.titulo}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{segmento.subtitulo}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PrimaryCta />
            </div>
          </Reveal>
        </section>

        {/* As dores do segmento */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
                O que trava o dia a dia — e o que o sistema faz com isso.
              </h2>
            </Reveal>
            <div className="mt-12">
              {segmento.dores.map((dor, i) => (
                <Reveal key={dor.queixa} delay={i * 60}>
                  <div className="grid gap-4 border-t border-line py-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
                    <p className="text-xl font-semibold leading-snug text-fg md:text-2xl">
                      &ldquo;{dor.queixa}&rdquo;
                    </p>
                    <p className="text-base leading-relaxed text-muted">{dor.resposta}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Módulos que importam neste segmento */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              O que costuma fazer diferença aqui.
            </h2>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-muted">
              O sistema tem mais coisas, mas estas são as que uma operação como a sua usa todo dia.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {recursos.map((recurso, i) => (
              <Reveal key={recurso.key} delay={i * 60}>
                <article className="h-full rounded-2xl border border-line bg-canvas p-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Check size={18} className="shrink-0 text-primary" aria-hidden="true" />
                    {recurso.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{recurso.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Perguntas do segmento */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-3xl px-4 py-20 md:px-8 lg:py-24">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Perguntas diretas.</h2>
            </Reveal>
            <div className="mt-8">
              {segmento.perguntas.map((faq, i) => (
                <Reveal key={faq.q} delay={i * 40}>
                  <details className="group border-t border-line py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-fg">
                      {faq.q}
                      <span className="shrink-0 text-xl font-medium text-primary transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{faq.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Chamada final */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-28">
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">
                Amanhã tem corte. Comece hoje.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-[#9eb1a8]">
                Criar a conta da sua confecção leva menos de dois minutos.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <PrimaryCta className="h-12 px-7 text-base" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Os outros segmentos: dá caminho para o visitante que caiu na página
            errada, e liga as três páginas entre si para o robô de busca achar
            todas a partir de qualquer uma. */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <p className="text-sm font-semibold text-body">A sua confecção é de outro tipo?</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {outros.map((outro) => (
              <Link
                key={outro.slug}
                href={`/para/${outro.slug}`}
                className="inline-flex h-11 items-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-semibold text-body transition hover:bg-canvas"
              >
                {outro.nome}
              </Link>
            ))}
            <Link
              href="/planos"
              className="inline-flex h-11 items-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-semibold text-body transition hover:bg-canvas"
            >
              Ver os planos
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
