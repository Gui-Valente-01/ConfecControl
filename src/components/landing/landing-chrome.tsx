import Link from "next/link";
import { Factory } from "lucide-react";
import { segmentos } from "@/lib/segmentos";

// Cabeçalho, rodapé e botão da área pública. Ficam aqui porque a landing e a
// página de planos são a mesma casa: se cada uma tivesse o seu, o menu
// mudaria de uma para a outra e o visitante acharia que trocou de site.

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-white">
        <Factory size={18} aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-fg">ConfecControl</span>
    </Link>
  );
}

/**
 * A chamada principal do site.
 *
 * Dizia "Criar minha conta", mas o cadastro exige um codigo que so e entregue
 * na contratacao — entao o botao prometia uma coisa e a tela seguinte pedia
 * outra. Enquanto a venda for assistida, a chamada precisa dizer a verdade:
 * o proximo passo e conversar, e nao se cadastrar.
 */
export function PrimaryCta({ className }: { className?: string }) {
  return (
    <Link
      href="/planos"
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark active:scale-[0.98] ${className ?? ""}`}
    >
      Falar com um especialista
    </Link>
  );
}

/**
 * O menu do topo.
 *
 * `base` existe porque os itens do menu apontam para pedaços da página
 * inicial. Na própria inicial o link é só a âncora; em qualquer outra página
 * precisa da barra na frente, senão o navegador procura a âncora na página
 * errada e o clique não faz nada.
 */
export function LandingHeader({ base = "" }: { base?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-shell/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-body md:flex" aria-label="Seções da página">
          <a href={`${base}#funcionalidades`} className="transition hover:text-primary">Funcionalidades</a>
          <a href={`${base}#como-funciona`} className="transition hover:text-primary">Como funciona</a>
          <Link href="/planos" className="transition hover:text-primary">Planos</Link>
          <a href={`${base}#perguntas`} className="transition hover:text-primary">Perguntas</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-body transition hover:bg-canvas"
          >
            Entrar
          </Link>
          {/* Quem esconde é o container, e não uma classe passada ao botão:
              o PrimaryCta já traz "inline-flex" embutido, e as duas regras de
              display brigavam — o botão continuava aparecendo em tela estreita
              e empurrava o cabeçalho para fora. */}
          <span className="hidden sm:inline-flex">
            <PrimaryCta className="h-10" />
          </span>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {/* As páginas por tipo de confecção ficam no rodapé de todo o site: é
            assim que o robô de busca chega até elas a partir de qualquer
            página, e que o visitante encontra a que fala da operação dele. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-6 text-sm">
          <span className="font-semibold text-body">Para a sua confecção:</span>
          {segmentos.map((segmento) => (
            <Link
              key={segmento.slug}
              href={`/para/${segmento.slug}`}
              className="text-muted transition hover:text-primary"
            >
              {segmento.nome}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden text-sm text-soft sm:inline">Gestão de produção para confecções.</span>
          </div>
          <div className="flex items-center gap-5 text-sm font-medium text-body">
            <Link href="/planos" className="transition hover:text-primary">Planos</Link>
            <Link href="/login" className="transition hover:text-primary">Entrar</Link>
            <Link href="/cadastro" className="transition hover:text-primary">Ativar minha empresa</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
