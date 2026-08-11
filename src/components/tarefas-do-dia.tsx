"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Layers,
  Package,
  PackageCheck,
  Plus,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Painel de trabalho do dia.
//
// A pergunta que esta tela responde é "o que eu preciso fazer agora?". Cada
// pendência é um número que abre a lista já filtrada — antes o aviso levava
// para a lista inteira, e a pessoa tinha que caçar quais eram os atrasados.
//
// Nasceu como cartões grandes, e com sete pendências virava uma parede de
// texto: a tela inteira era aviso, e o resto do painel sumia. Agora o padrão é
// a faixa compacta, com UMA linha dizendo por onde começar. Quem quiser a
// explicação de cada pendência abre em "o que fazer" — e essa escolha fica
// guardada no aparelho, porque quem abriu uma vez costuma querer sempre.
//
// Pendência zerada não aparece: lista de tarefas com item vazio vira ruído, e
// a pessoa para de ler. Quando não sobra nenhuma, entra a linha de tudo em dia.

const CHAVE_PREFERENCIA = "cc:tarefas-detalhadas";

// A escolha entre faixa compacta e cartões fica no aparelho, não no banco: é
// preferência de quem está olhando, e o mesmo login pode estar no computador da
// sala e no celular da bancada, onde a tela pequena pede compacto de qualquer
// jeito.
//
// Isto é uma "loja externa" no sentido do React — um valor que vive fora dele.
// Ler no meio da renderização faria o servidor desenhar compacto e o navegador
// desenhar detalhado, o que quebra a hidratação; ler num efeito e chamar
// setState causa renderização em cascata. useSyncExternalStore existe para
// exatamente este caso: entrega o valor do servidor na hidratação e troca para
// o do aparelho logo em seguida.

let ouvintes: (() => void)[] = [];

function assinarPreferencia(avisar: () => void): () => void {
  ouvintes = [...ouvintes, avisar];
  return () => {
    ouvintes = ouvintes.filter((o) => o !== avisar);
  };
}

function lerPreferencia(): boolean {
  try {
    return localStorage.getItem(CHAVE_PREFERENCIA) === "1";
  } catch {
    // Navegador com armazenamento bloqueado: segue no modo compacto.
    return false;
  }
}

/** No servidor não existe aparelho: começa compacto, que é o padrão. */
function preferenciaDoServidor(): boolean {
  return false;
}

function gravarPreferencia(valor: boolean): void {
  try {
    localStorage.setItem(CHAVE_PREFERENCIA, valor ? "1" : "0");
  } catch {
    // Não poder guardar a escolha não pode impedir de abrir agora.
  }
  for (const avisar of ouvintes) avisar();
}

export type Tarefa = {
  chave: string;
  quantidade: number;
  titulo: string;
  /**
   * Versão curta para a faixa compacta: "atrasados", "para hoje".
   *
   * Acompanha singular e plural igual ao título: na faixa ele vem colado no
   * número, e "1 peças acabando" faz a pessoa reler para entender.
   */
  curto: string;
  /** O que fazer com isso. Uma linha, em linguagem de oficina. */
  acao: string;
  href: string;
  icone: LucideIcon;
  urgencia: "urgente" | "atencao" | "normal";
};

const TONS = {
  urgente: {
    cartao: "border-danger-line bg-danger-soft hover:border-danger-line hover:bg-danger-soft",
    icone: "bg-danger-soft text-danger-dark",
    numero: "text-danger-dark",
  },
  atencao: {
    cartao: "border-warning-line bg-warning-soft hover:border-warning-line hover:bg-warning-soft",
    icone: "bg-warning-soft text-warning-ink",
    numero: "text-warning-ink",
  },
  normal: {
    cartao: "border-line bg-surface hover:border-primary/30 hover:bg-primary-soft",
    icone: "bg-primary-soft text-primary-dark",
    numero: "text-primary-dark",
  },
} as const;

/** Da mais grave para a menos grave. Define quem fica na frente da faixa. */
const PESO: Record<Tarefa["urgencia"], number> = { urgente: 0, atencao: 1, normal: 2 };

export type ContagensDoDia = {
  atrasados: number;
  hoje: number;
  aguardandoMaterial: number;
  prontos: number;
  aReceber: number;
  estoqueBaixo: number;
  custoIncompleto: number;
};

type TarefasDoDiaProps = {
  contagens: ContagensDoDia;
  mostrarFinanceiro: boolean;
  mostrarEstoque: boolean;
  podeCriarPedido: boolean;
};

export function montarTarefas(
  c: ContagensDoDia,
  mostrarFinanceiro: boolean,
  mostrarEstoque: boolean,
): Tarefa[] {
  const todas: Tarefa[] = [
    {
      chave: "atrasados",
      quantidade: c.atrasados,
      titulo: c.atrasados === 1 ? "pedido atrasado" : "pedidos atrasados",
      curto: c.atrasados === 1 ? "atrasado" : "atrasados",
      acao: "O prazo já passou. Avise o cliente ou corra com a produção.",
      href: "/pedidos?filtro=atrasados",
      icone: AlertTriangle,
      urgencia: "urgente",
    },
    {
      chave: "hoje",
      quantidade: c.hoje,
      titulo: c.hoje === 1 ? "entrega para hoje" : "entregas para hoje",
      curto: "para hoje",
      acao: "Precisa sair hoje. Confira se está pronto.",
      href: "/pedidos?filtro=hoje",
      icone: CalendarClock,
      urgencia: "atencao",
    },
    {
      chave: "material",
      quantidade: c.aguardandoMaterial,
      titulo: c.aguardandoMaterial === 1 ? "pedido esperando material" : "pedidos esperando material",
      curto: "esperando material",
      acao: "A produção está parada. Separe o material para liberar.",
      href: "/pedidos?filtro=material",
      icone: Package,
      urgencia: "atencao",
    },
    {
      chave: "prontos",
      quantidade: c.prontos,
      titulo: c.prontos === 1 ? "pedido pronto para entrega" : "pedidos prontos para entrega",
      curto: c.prontos === 1 ? "pronto para entrega" : "prontos para entrega",
      acao: "Terminou a produção. Avise o cliente para retirar.",
      href: "/pedidos?filtro=prontos",
      icone: Truck,
      urgencia: "normal",
    },
    ...(mostrarFinanceiro
      ? [
          {
            chave: "receber",
            quantidade: c.aReceber,
            titulo: c.aReceber === 1 ? "pedido com valor em aberto" : "pedidos com valor em aberto",
            curto: "a receber",
            acao: "Falta receber. Cobre pelo WhatsApp direto do Financeiro.",
            href: "/financeiro",
            icone: CircleDollarSign,
            urgencia: "atencao" as const,
          },
        ]
      : []),
    ...(mostrarEstoque
      ? [
          {
            chave: "estoque",
            quantidade: c.estoqueBaixo,
            titulo: c.estoqueBaixo === 1 ? "peça acabando" : "peças acabando",
            curto: c.estoqueBaixo === 1 ? "peça acabando" : "peças acabando",
            acao: "Está abaixo do mínimo. Compre antes de faltar no meio do pedido.",
            href: "/estoque",
            icone: PackageCheck,
            urgencia: "atencao" as const,
          },
        ]
      : []),
    {
      chave: "custo",
      quantidade: c.custoIncompleto,
      titulo: c.custoIncompleto === 1 ? "peça sem custo completo" : "peças sem custo completo",
      curto: c.custoIncompleto === 1 ? "peça sem custo" : "peças sem custo",
      acao: "Sem o custo, o lucro do relatório aparece maior do que é.",
      href: "/produtos",
      icone: Layers,
      urgencia: "normal",
    },
  ];

  // Zero não vira aviso: lista com item vazio vira ruído e ninguém lê.
  return todas.filter((t) => t.quantidade > 0);
}

/**
 * Põe o mais grave na frente.
 *
 * Na faixa compacta a primeira pendência é a que ganha a linha de "comece por
 * aqui", então ela precisa ser a mais grave de verdade — e não a que por acaso
 * foi escrita primeiro na lista. Empate mantém a ordem original, que já vai do
 * chão de fábrica para o escritório.
 */
export function ordenarPorUrgencia(tarefas: Tarefa[]): Tarefa[] {
  return [...tarefas].sort((a, b) => PESO[a.urgencia] - PESO[b.urgencia]);
}

export function TarefasDoDia({
  contagens,
  mostrarFinanceiro,
  mostrarEstoque,
  podeCriarPedido,
}: TarefasDoDiaProps) {
  const tarefas = ordenarPorUrgencia(montarTarefas(contagens, mostrarFinanceiro, mostrarEstoque));

  const detalhado = useSyncExternalStore(
    assinarPreferencia,
    lerPreferencia,
    preferenciaDoServidor,
  );

  return (
    <section aria-labelledby="tarefas-titulo" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tarefas-titulo" className="text-lg font-semibold text-fg">
          O que precisa da sua atenção
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {tarefas.length > 0 ? (
            <button
              type="button"
              onClick={() => gravarPreferencia(!detalhado)}
              aria-expanded={detalhado}
              aria-controls="tarefas-lista"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-body transition hover:bg-tint"
            >
              {detalhado ? "Ocultar detalhes" : "O que fazer"}
              <ChevronDown
                size={15}
                aria-hidden="true"
                className={`transition-transform ${detalhado ? "rotate-180" : ""}`}
              />
            </button>
          ) : null}

          {/* Uma ação principal por seção: é o que a pessoa mais vai querer fazer. */}
          {podeCriarPedido ? (
            <Link
              href="/pedidos"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
            >
              <Plus size={17} aria-hidden="true" />
              Novo pedido
            </Link>
          ) : null}
        </div>
      </div>

      {tarefas.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-3 py-2.5 text-sm text-primary-dark">
          <CheckCircle2 size={17} className="shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Tudo em dia.</strong> Nenhum pedido atrasado, nada parado
            esperando material e nenhuma peça acabando.
          </span>
        </p>
      ) : detalhado ? (
        <ul id="tarefas-lista" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tarefas.map((tarefa) => {
            const tom = TONS[tarefa.urgencia];
            const Icone = tarefa.icone;
            return (
              <li key={tarefa.chave}>
                <Link
                  href={tarefa.href}
                  className={`flex h-full items-start gap-3 rounded-xl border p-4 transition ${tom.cartao}`}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tom.icone}`}
                  >
                    <Icone size={19} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className={`text-xl font-bold tabular-nums ${tom.numero}`}>
                        {tarefa.quantidade}
                      </span>
                      <span className="font-semibold text-fg">{tarefa.titulo}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-muted">{tarefa.acao}</span>
                  </span>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-soft" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <ul id="tarefas-lista" className="flex flex-wrap gap-2">
            {tarefas.map((tarefa) => {
              const tom = TONS[tarefa.urgencia];
              const Icone = tarefa.icone;
              return (
                <li key={tarefa.chave}>
                  <Link
                    href={tarefa.href}
                    // O texto completo fica no title: no computador aparece ao
                    // parar o mouse em cima, sem ocupar espaço na tela.
                    title={`${tarefa.quantidade} ${tarefa.titulo}. ${tarefa.acao}`}
                    className={`inline-flex h-11 items-center gap-2 rounded-lg border px-3 text-sm transition ${tom.cartao}`}
                  >
                    <Icone size={16} className={`shrink-0 ${tom.numero}`} aria-hidden="true" />
                    <span className={`font-bold tabular-nums ${tom.numero}`}>{tarefa.quantidade}</span>
                    <span className="text-body">{tarefa.curto}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Uma linha só, sempre da pendência mais grave. Sem isto a faixa
              vira um monte de número sem dizer o que fazer com ele. */}
          <p className="text-sm leading-5 text-muted">
            <span className="font-semibold text-body">Comece por aqui:</span> {tarefas[0].acao}
          </p>
        </>
      )}
    </section>
  );
}
