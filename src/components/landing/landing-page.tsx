import Link from "next/link";
import {
  Check,
  CreditCard,
  Factory,
  MessageCircle,
  Printer,
  Ruler,
} from "lucide-react";
import { MiniBoard, MiniChat, MiniFinance, MiniPhone, MiniStock } from "./landing-previews";
import { Reveal } from "./reveal";

const pains = [
  {
    quote: "O tecido acabou no meio do corte.",
    fix: "Cada peça tem ficha técnica. Ao lançar o pedido, o sistema baixa o material do estoque e avisa quando chegar no mínimo, antes de faltar.",
  },
  {
    quote: "A cliente ligou cobrando um pedido que ninguém lembrava.",
    fix: "Todo pedido tem prazo, etapa e responsável. O que atrasou aparece em vermelho na primeira tela, sem precisar procurar.",
  },
  {
    quote: "Entregou tudo e esqueceu de cobrar a segunda parte.",
    fix: "O financeiro mostra quem pagou entrada, quem deve saldo e de qual pedido. A cobrança deixa de depender da memória.",
  },
];

const steps = [
  {
    title: "Cadastre clientes, peças e materiais",
    body: "Uma vez só. A ficha técnica de cada peça diz quanto tecido e aviamento ela consome.",
  },
  {
    title: "Lance os pedidos em aberto",
    body: "Cliente, itens, prazo e entrada. O estoque baixa sozinho e o pedido entra na fila de produção.",
  },
  {
    title: "Acompanhe o quadro todo dia",
    body: "Corte, costura, acabamento, entrega. Cada um move a sua etapa e o painel mostra o que precisa de atenção.",
  },
];

const faqs = [
  {
    q: "Quanto custa?",
    a: "Hoje o ConfecControl é gratuito. Você cria a conta da sua confecção e começa a usar no mesmo dia.",
  },
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. Funciona no navegador, no computador e no celular. Se quiser, dá para instalar como aplicativo direto do navegador, sem loja.",
  },
  {
    q: "Minha equipe inteira pode usar?",
    a: "Sim. Cada funcionário tem o próprio acesso, com cargo definido: dono, gerente, produção, financeiro ou vendas. Cada um vê o que precisa.",
  },
  {
    q: "Meus dados ficam separados de outras empresas?",
    a: "Ficam. Cada confecção acessa somente os próprios clientes, pedidos e valores.",
  },
  {
    q: "Já tenho pedidos andando. Como começo?",
    a: "Cadastra os pedidos em aberto com a etapa em que estão e segue a produção a partir dali. Não precisa esperar o mês virar.",
  },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-[#087f7d] text-white">
        <Factory size={18} aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-[#1c2420]">ConfecControl</span>
    </Link>
  );
}

function PrimaryCta({ className }: { className?: string }) {
  return (
    <Link
      href="/cadastro"
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#087f7d] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05605e] active:scale-[0.98] ${className ?? ""}`}
    >
      Criar conta grátis
    </Link>
  );
}

export function LandingPage() {
  return (
    <div className="bg-[#f4f6f5] text-[#1c2420]">
      {/* Navegação */}
      <header className="sticky top-0 z-40 border-b border-[#d9e1dd] bg-[#f4f6f5]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#405047] md:flex" aria-label="Seções da página">
            <a href="#funcionalidades" className="transition hover:text-[#087f7d]">Funcionalidades</a>
            <a href="#como-funciona" className="transition hover:text-[#087f7d]">Como funciona</a>
            <a href="#perguntas" className="transition hover:text-[#087f7d]">Perguntas</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-lg border border-[#c7d3ce] bg-white px-4 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]"
            >
              Entrar
            </Link>
            <PrimaryCta className="hidden h-10 sm:inline-flex" />
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <h1 className="lp-hero-item max-w-xl text-4xl font-semibold leading-[1.06] tracking-tight md:text-5xl xl:text-[3.4rem]" style={{ animationDelay: "0ms" }}>
              O caderno de pedidos não avisa quando a entrega atrasa.
            </h1>
            <p className="lp-hero-item mt-5 max-w-md text-lg leading-relaxed text-[#63736b]" style={{ animationDelay: "110ms" }}>
              O ConfecControl avisa. Pedidos, produção, estoque de tecido e cobrança no mesmo lugar, do corte à entrega.
            </p>
            <div className="lp-hero-item mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "220ms" }}>
              <PrimaryCta />
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-lg border border-[#c7d3ce] bg-white px-5 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]"
              >
                Entrar
              </Link>
            </div>
          </div>
          <div className="lp-hero-item lg:-rotate-1" style={{ animationDelay: "300ms" }}>
            <MiniBoard />
          </div>
        </section>

        {/* Dores concretas */}
        <section className="border-t border-[#d9e1dd] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-24">
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
                Três prejuízos que se repetem todo mês. Em qualquer confecção.
              </h2>
            </Reveal>
            <div className="mt-12">
              {pains.map((pain, i) => (
                <Reveal key={pain.quote} delay={i * 60}>
                  <div className="grid gap-4 border-t border-[#d9e1dd] py-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
                    <p className="text-xl font-semibold leading-snug text-[#1c2420] md:text-2xl">
                      &ldquo;{pain.quote}&rdquo;
                    </p>
                    <p className="text-base leading-relaxed text-[#63736b]">{pain.fix}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Funcionalidades (bento) */}
        <section id="funcionalidades" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-8 lg:py-24">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              Tudo que a produção precisa, em uma tela.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-12">
            <Reveal className="md:col-span-7">
              <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-[#d9e1dd] bg-[#f8faf9] p-6">
                <div>
                  <h3 className="text-lg font-semibold">Estoque que baixa sozinho</h3>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#63736b]">
                    Cada pedido consome tecido e aviamento conforme a ficha técnica. Quando um material chega no mínimo, aparece o alerta de reposição.
                  </p>
                </div>
                <MiniStock />
              </div>
            </Reveal>
            <Reveal className="md:col-span-5" delay={80}>
              <div className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-[#111a16] p-6 text-white">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <MessageCircle size={18} className="text-[#25d366]" aria-hidden="true" />
                    Cliente avisado sem digitar
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#9eb1a8]">
                    O status do pedido vira mensagem pronta de WhatsApp, com número, etapa e prazo.
                  </p>
                </div>
                <MiniChat />
              </div>
            </Reveal>
            <Reveal className="md:col-span-4">
              <div className="h-full rounded-2xl border border-[#cfe4e0] bg-[#e8f6f3] p-6">
                <Ruler size={20} className="text-[#0f696b]" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold">Ficha técnica por peça</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#405047]">
                  Consumo de material, preço padrão, custo e prazo médio de cada modelo. O lucro por pedido sai calculado nos relatórios.
                </p>
              </div>
            </Reveal>
            <Reveal className="md:col-span-4" delay={60}>
              <div className="flex h-full flex-col justify-between gap-5 rounded-2xl border border-[#d9e1dd] bg-white p-6">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <CreditCard size={18} className="text-[#087f7d]" aria-hidden="true" />
                    Cobrança por pedido
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#63736b]">
                    Entrada, saldo e quem está devendo, direto na tela do financeiro.
                  </p>
                </div>
                <MiniFinance />
              </div>
            </Reveal>
            <Reveal className="md:col-span-4" delay={120}>
              <div className="h-full rounded-2xl border border-[#d9e1dd] bg-white p-6">
                <Printer size={20} className="text-[#087f7d]" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold">Papel para quem precisa</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#63736b]">
                  Ficha do pedido pronta para imprimir e mandar para a oficina ou a facção parceira. Relatórios saem em planilha.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="border-t border-[#d9e1dd] bg-white">
          <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-8 lg:py-24">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">No ar em uma tarde.</h2>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-[#63736b]">
                Sem consultoria, sem treinamento pago. Quem sabe usar WhatsApp aprende o ConfecControl.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 80}>
                  <div className="border-t-2 border-[#111a16] pt-5">
                    <h3 className="text-lg font-semibold leading-snug">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#63736b]">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Celular / PWA */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:px-8 lg:grid-cols-2 lg:py-24">
          <Reveal>
            <h2 className="max-w-md text-3xl font-semibold tracking-tight md:text-4xl">
              No celular de quem corta, costura e entrega.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[#63736b]">
              Instala como aplicativo direto do navegador, sem loja. O encarregado avança a etapa no chão de fábrica e todo mundo vê na hora.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm font-medium text-[#405047]">
              {[
                "Cada funcionário com o próprio acesso",
                "Cargo define o que cada um enxerga",
                "Histórico de quem moveu cada pedido",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check size={16} className="shrink-0 text-[#087f7d]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <MiniPhone />
          </Reveal>
        </section>

        {/* Perguntas */}
        <section id="perguntas" className="border-t border-[#d9e1dd] bg-white">
          <div className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 md:px-8 lg:py-24">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Perguntas diretas.</h2>
            </Reveal>
            <div className="mt-8">
              {faqs.map((faq, i) => (
                <Reveal key={faq.q} delay={i * 40}>
                  <details className="group border-t border-[#d9e1dd] py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[#1c2420]">
                      {faq.q}
                      <span className="shrink-0 text-xl font-medium text-[#087f7d] transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#63736b]">{faq.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Chamada final */}
        <section className="bg-[#111a16] text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 lg:py-28">
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">
                Amanhã tem corte. Comece hoje.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-[#9eb1a8]">
                Criar a conta da sua confecção leva menos de dois minutos.
              </p>
              <div className="mt-8">
                <PrimaryCta className="h-12 px-7 text-base" />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-[#d9e1dd]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 md:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden text-sm text-[#8a9890] sm:inline">Gestão de produção para confecções.</span>
          </div>
          <div className="flex items-center gap-5 text-sm font-medium text-[#405047]">
            <Link href="/login" className="transition hover:text-[#087f7d]">Entrar</Link>
            <Link href="/cadastro" className="transition hover:text-[#087f7d]">Criar conta grátis</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
