// As contas do relatório. Sem banco e sem React, para permitir teste.
//
// Moravam dentro da tela, misturadas com o layout — e por isso nunca tinham
// sido testadas. Três erros passaram assim: o lucro por cliente esquecia os
// serviços, a pontualidade contava cada pedido duas vezes e o "este mês" do
// servidor começava às 21h do dia anterior.
//
// Regra da casa: o mesmo número sai da mesma função em todo lugar. O resumo do
// período, o período anterior e a planilha usam estas contas, e não cópias.

import { ePreset, fimDoDia, lerDiaIso, inicioDoDia, periodoDoPreset, type Periodo, type Preset } from "@/lib/datas";
import { sumReceipts } from "@/lib/payments";
import { agruparRentabilidade, ordenarPorLucro, type LinhaVendida, type Rentabilidade } from "@/lib/rentabilidade";

export type TipoPeca = "PRODUCT" | "SERVICE";

export type PecaDoCatalogo = {
  id: string;
  nome: string;
  custoInCents: number;
  tipo: TipoPeca;
};

export type PedidoDoRelatorio = {
  clienteId: string;
  clienteNome: string;
  totalInCents: number;
  itens: { productId: string | null; descricao: string; quantidade: number; totalInCents: number }[];
  servicos: { nome: string; precoInCents: number }[];
  recebimentos: { amountInCents: number }[];
};

// ---------------------------------------------------------------------------
// Período
// ---------------------------------------------------------------------------

export type PeriodoEscolhido = Periodo & { preset: Preset | null };

/**
 * O período pedido na URL, no calendário de Brasília.
 *
 * Botão rápido ganha das datas; datas inválidas caem no mês atual. "Até"
 * antes de "De" é trocado, em vez de devolver um relatório vazio que parece
 * dizer "não vendeu nada".
 */
export function resolverPeriodo(
  params: { from?: string | null; to?: string | null; preset?: string | null },
  agora: Date = new Date(),
): PeriodoEscolhido {
  if (ePreset(params.preset)) return { ...periodoDoPreset(params.preset, agora), preset: params.preset };

  const de = lerDiaIso(params.from);
  const ate = lerDiaIso(params.to);
  if (!de && !ate) return { ...periodoDoPreset("mes", agora), preset: "mes" };

  const mes = periodoDoPreset("mes", agora);
  let inicio = de ? inicioDoDia(de) : mes.de;
  let fim = ate ? fimDoDia(ate) : mes.ate;
  if (fim < inicio) [inicio, fim] = [inicioDoDia(ate ?? de!), fimDoDia(de ?? ate!)];
  return { de: inicio, ate: fim, preset: null };
}

// ---------------------------------------------------------------------------
// Dinheiro do período
// ---------------------------------------------------------------------------

export type ResumoVendas = {
  pedidos: number;
  /** Soma do total dos pedidos feitos no período. */
  faturamentoInCents: number;
  /** Quanto desses pedidos já foi pago (em qualquer data). */
  pagoDestesPedidosInCents: number;
  /** Saldo desses pedidos. Nunca negativo por pedido. */
  aReceberDestesPedidosInCents: number;
  receitaPecasInCents: number;
  receitaServicosInCents: number;
  custoInCents: number;
  lucroInCents: number;
  /** Porcentagem inteira. Zero sem receita. */
  margem: number;
  /** Linhas vendidas sem custo conhecido: o lucro está por cima do real. */
  vendasSemCusto: number;
  porTipo: Record<TipoPeca, { receitaInCents: number; unidades: number }>;
};

function custoDaLinha(item: PedidoDoRelatorio["itens"][number], catalogo: Map<string, PecaDoCatalogo>): number {
  if (!item.productId) return 0;
  return (catalogo.get(item.productId)?.custoInCents ?? 0) * item.quantidade;
}

export function indexarCatalogo(pecas: PecaDoCatalogo[]): Map<string, PecaDoCatalogo> {
  return new Map(pecas.map((p) => [p.id, p]));
}

/**
 * Faturamento, lucro e margem dos pedidos do período.
 *
 * Lucro = peças + serviços − custo cadastrado das peças. Serviço entra com
 * custo zero, porque o sistema não guarda custo de serviço. É uma estimativa:
 * aluguel, salário e imposto ficam de fora.
 */
export function resumirVendas(pedidos: PedidoDoRelatorio[], catalogo: Map<string, PecaDoCatalogo>): ResumoVendas {
  const r: ResumoVendas = {
    pedidos: pedidos.length,
    faturamentoInCents: 0,
    pagoDestesPedidosInCents: 0,
    aReceberDestesPedidosInCents: 0,
    receitaPecasInCents: 0,
    receitaServicosInCents: 0,
    custoInCents: 0,
    lucroInCents: 0,
    margem: 0,
    vendasSemCusto: 0,
    porTipo: { PRODUCT: { receitaInCents: 0, unidades: 0 }, SERVICE: { receitaInCents: 0, unidades: 0 } },
  };

  for (const pedido of pedidos) {
    const pago = sumReceipts(pedido.recebimentos);
    r.faturamentoInCents += pedido.totalInCents;
    r.pagoDestesPedidosInCents += pago;
    r.aReceberDestesPedidosInCents += Math.max(0, pedido.totalInCents - pago);

    for (const item of pedido.itens) {
      r.receitaPecasInCents += item.totalInCents;
      const custo = custoDaLinha(item, catalogo);
      r.custoInCents += custo;
      if (custo === 0) r.vendasSemCusto += 1;
      if (item.productId) {
        const tipo = catalogo.get(item.productId)?.tipo ?? "PRODUCT";
        r.porTipo[tipo].receitaInCents += item.totalInCents;
        r.porTipo[tipo].unidades += item.quantidade;
      }
    }
    for (const servico of pedido.servicos) r.receitaServicosInCents += servico.precoInCents;
  }

  const receita = r.receitaPecasInCents + r.receitaServicosInCents;
  r.lucroInCents = receita - r.custoInCents;
  r.margem = receita > 0 ? Math.round((r.lucroInCents / receita) * 100) : 0;
  return r;
}

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------

function chaveDaPeca(item: PedidoDoRelatorio["itens"][number]): string {
  return item.productId ?? `desc:${item.descricao}`;
}

function rotuloDaPeca(item: PedidoDoRelatorio["itens"][number], catalogo: Map<string, PecaDoCatalogo>): string {
  return item.productId ? catalogo.get(item.productId)?.nome ?? item.descricao : item.descricao;
}

/** Lucro por peça, do que mais dá lucro para o que menos dá. Serviços ficam de fora: não são peça. */
export function rentabilidadePorPeca(pedidos: PedidoDoRelatorio[], catalogo: Map<string, PecaDoCatalogo>): Rentabilidade[] {
  return ordenarPorLucro(
    agruparRentabilidade(
      pedidos.flatMap((p) =>
        p.itens.map((item) => ({
          chave: chaveDaPeca(item),
          rotulo: rotuloDaPeca(item, catalogo),
          quantidade: item.quantidade,
          receitaInCents: item.totalInCents,
          custoInCents: custoDaLinha(item, catalogo),
        })),
      ),
    ),
  );
}

/**
 * Lucro por cliente, INCLUINDO os serviços cobrados.
 *
 * Antes somava só as peças: o cliente de uma serigrafia, que paga só serviço,
 * aparecia com lucro zero, e a soma da lista não batia com o "Lucro estimado".
 * Agora a soma da lista é exatamente o lucro do período.
 */
export function rentabilidadePorCliente(pedidos: PedidoDoRelatorio[], catalogo: Map<string, PecaDoCatalogo>): Rentabilidade[] {
  const linhas: LinhaVendida[] = [];
  for (const p of pedidos) {
    for (const item of p.itens) {
      linhas.push({
        chave: p.clienteId,
        rotulo: p.clienteNome,
        quantidade: item.quantidade,
        receitaInCents: item.totalInCents,
        custoInCents: custoDaLinha(item, catalogo),
      });
    }
    for (const s of p.servicos) {
      linhas.push({ chave: p.clienteId, rotulo: p.clienteNome, quantidade: 0, receitaInCents: s.precoInCents, custoInCents: 0, servico: true });
    }
  }
  return ordenarPorLucro(agruparRentabilidade(linhas));
}

/** Peças mais vendidas, por unidades. */
export function maisVendidas(pedidos: PedidoDoRelatorio[], catalogo: Map<string, PecaDoCatalogo>, quantas = 5) {
  const mapa = new Map<string, { rotulo: string; quantidade: number; receitaInCents: number }>();
  for (const item of pedidos.flatMap((p) => p.itens)) {
    const chave = chaveDaPeca(item);
    const atual = mapa.get(chave) ?? { rotulo: rotuloDaPeca(item, catalogo), quantidade: 0, receitaInCents: 0 };
    atual.quantidade += item.quantidade;
    atual.receitaInCents += item.totalInCents;
    mapa.set(chave, atual);
  }
  return [...mapa.values()].sort((a, b) => b.quantidade - a.quantidade).slice(0, quantas);
}

/** Quem mais compra, pelo total dos pedidos. */
export function quemMaisCompra(pedidos: PedidoDoRelatorio[], quantos = 5) {
  const mapa = new Map<string, { nome: string; pedidos: number; totalInCents: number }>();
  for (const p of pedidos) {
    const atual = mapa.get(p.clienteId) ?? { nome: p.clienteNome, pedidos: 0, totalInCents: 0 };
    atual.pedidos += 1;
    atual.totalInCents += p.totalInCents;
    mapa.set(p.clienteId, atual);
  }
  return [...mapa.values()].sort((a, b) => b.totalInCents - a.totalInCents).slice(0, quantos);
}

/** Quanto cada serviço rendeu no período, e quantas vezes foi cobrado. */
export function faturamentoPorServico(pedidos: PedidoDoRelatorio[]) {
  const mapa = new Map<string, { nome: string; receitaInCents: number; vezes: number }>();
  for (const s of pedidos.flatMap((p) => p.servicos)) {
    const atual = mapa.get(s.nome) ?? { nome: s.nome, receitaInCents: 0, vezes: 0 };
    atual.receitaInCents += s.precoInCents;
    atual.vezes += 1;
    mapa.set(s.nome, atual);
  }
  return [...mapa.values()].sort((a, b) => b.receitaInCents - a.receitaInCents);
}

// ---------------------------------------------------------------------------
// Caixa
// ---------------------------------------------------------------------------

/**
 * O instante cai no período? Borda incluída dos dois lados — é a mesma regra
 * do `gte`/`lte` das consultas ao banco, para a tela e o teste concordarem.
 */
export function dentroDoPeriodo(quando: Date, periodo: Periodo): boolean {
  return quando >= periodo.de && quando <= periodo.ate;
}

export type RecebimentoDoCaixa = { amountInCents: number; paidAt: Date | null; createdAt: Date };

/**
 * Dinheiro que ENTROU no período, pela data do recebimento.
 *
 * É diferente do "pago destes pedidos": um pedido de agosto quitado em
 * setembro é faturamento de agosto e caixa de setembro. Para saber quanto
 * entrou na semana, é esta a conta.
 */
export function entrouNoCaixa(recebimentos: RecebimentoDoCaixa[], periodo: Periodo) {
  const noPeriodo = recebimentos.filter((r) => dentroDoPeriodo(r.paidAt ?? r.createdAt, periodo));
  return { totalInCents: sumReceipts(noPeriodo), recebimentos: noPeriodo.length };
}
