import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
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
// A pergunta que esta tela responde é "o que eu preciso fazer agora?". Por isso
// cada cartão é uma pendência com número, e cada um é um link que abre a lista
// já filtrada — antes o aviso levava para a lista inteira, e a pessoa tinha que
// caçar quais eram os três pedidos atrasados.
//
// Cartão com zero não aparece: lista de tarefas com item vazio vira ruído, e a
// pessoa para de ler. Quando não sobra nenhum, entra a mensagem de tudo em dia.

export type Tarefa = {
  chave: string;
  quantidade: number;
  titulo: string;
  /** O que fazer com isso. Uma linha, em linguagem de oficina. */
  acao: string;
  href: string;
  icone: LucideIcon;
  urgencia: "urgente" | "atencao" | "normal";
};

const TONS = {
  urgente: {
    cartao: "border-[#f1c0c9] bg-[#fff5f7] hover:border-[#e79aa8] hover:bg-[#ffeef1]",
    icone: "bg-[#fde8ec] text-[#9f2f42]",
    numero: "text-[#9f2f42]",
  },
  atencao: {
    cartao: "border-[#ead49c] bg-[#fffcf3] hover:border-[#dcbf76] hover:bg-[#fff8e6]",
    icone: "bg-[#fdf3da] text-[#7b5a0b]",
    numero: "text-[#7b5a0b]",
  },
  normal: {
    cartao: "border-[#d9e1dd] bg-white hover:border-[#bfe0d9] hover:bg-[#f6fbfa]",
    icone: "bg-[#e8f6f3] text-[#05605e]",
    numero: "text-[#05605e]",
  },
} as const;

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
      acao: "O prazo já passou. Avise o cliente ou corra com a produção.",
      href: "/pedidos?filtro=atrasados",
      icone: AlertTriangle,
      urgencia: "urgente",
    },
    {
      chave: "hoje",
      quantidade: c.hoje,
      titulo: c.hoje === 1 ? "entrega para hoje" : "entregas para hoje",
      acao: "Precisa sair hoje. Confira se está pronto.",
      href: "/pedidos?filtro=hoje",
      icone: CalendarClock,
      urgencia: "atencao",
    },
    {
      chave: "material",
      quantidade: c.aguardandoMaterial,
      titulo: c.aguardandoMaterial === 1 ? "pedido esperando material" : "pedidos esperando material",
      acao: "A produção está parada. Separe o material para liberar.",
      href: "/pedidos?filtro=material",
      icone: Package,
      urgencia: "atencao",
    },
    {
      chave: "prontos",
      quantidade: c.prontos,
      titulo: c.prontos === 1 ? "pedido pronto para entrega" : "pedidos prontos para entrega",
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
            titulo: c.estoqueBaixo === 1 ? "material acabando" : "materiais acabando",
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
      acao: "Sem o custo, o lucro do relatório aparece maior do que é.",
      href: "/produtos",
      icone: Layers,
      urgencia: "normal",
    },
  ];

  // Zero não vira cartão: lista com item vazio vira ruído e ninguém lê.
  return todas.filter((t) => t.quantidade > 0);
}

export function TarefasDoDia({
  contagens,
  mostrarFinanceiro,
  mostrarEstoque,
  podeCriarPedido,
}: TarefasDoDiaProps) {
  const tarefas = montarTarefas(contagens, mostrarFinanceiro, mostrarEstoque);

  return (
    <section aria-labelledby="tarefas-titulo" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="tarefas-titulo" className="text-lg font-semibold text-[#1c2420]">
            O que precisa da sua atenção
          </h2>
          <p className="mt-0.5 text-sm text-[#66756d]">
            {tarefas.length > 0
              ? "Toque num aviso para abrir a lista já filtrada."
              : "Nenhuma pendência no momento."}
          </p>
        </div>

        {/* Uma ação principal por seção: é o que a pessoa mais vai querer fazer. */}
        {podeCriarPedido ? (
          <Link
            href="/pedidos"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#087f7d] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05605e]"
          >
            <Plus size={17} aria-hidden="true" />
            Novo pedido
          </Link>
        ) : null}
      </div>

      {tarefas.length === 0 ? (
        <div className="rounded-xl border border-[#bfe0d9] bg-[#e8f6f3] p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto text-[#05605e]" aria-hidden="true" />
          <h3 className="mt-2 font-semibold text-[#05605e]">Tudo em dia</h3>
          <p className="mt-1 text-sm text-[#3f7d78]">
            Nenhum pedido atrasado, nada parado esperando material e nenhum material acabando.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tarefas.map((tarefa) => {
            const tom = TONS[tarefa.urgencia];
            const Icone = tarefa.icone;
            return (
              <li key={tarefa.chave}>
                <Link
                  href={tarefa.href}
                  className={`flex h-full items-start gap-3 rounded-xl border p-4 transition ${tom.cartao}`}
                >
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tom.icone}`}>
                    <Icone size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <strong className={`text-2xl font-semibold tabular-nums ${tom.numero}`}>
                        {tarefa.quantidade}
                      </strong>
                      <span className="font-semibold text-[#1c2420]">{tarefa.titulo}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[#66756d]">{tarefa.acao}</span>
                  </span>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-[#8a9890]" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
