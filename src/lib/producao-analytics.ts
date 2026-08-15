// Análise de produção. Sem banco e sem React, para permitir teste.
//
// O relatório media dinheiro e não media PRODUÇÃO — numa empresa que vive de
// prazo, isso é metade do quadro faltando. Os dados já estavam sendo gravados
// (histórico de etapa, tarefa de bancada, movimentação de estoque); ninguém
// nunca leu.
//
// As perguntas que estas contas respondem:
//   - entrego no prazo? quanto atraso, em média?
//   - onde o pedido fica parado? (o gargalo)
//   - quanto tempo leva um pedido do começo ao fim?
//   - quem produz quanto?
//   - com que frequência falta material no meio do trabalho?

const DIA_MS = 86400000;

function emDias(inicio: Date, fim: Date): number {
  return (fim.getTime() - inicio.getTime()) / DIA_MS;
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

/** Mediana: menos sensível a um pedido esquecido meses no sistema. */
function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 === 0 ? (ordenado[meio - 1] + ordenado[meio]) / 2 : ordenado[meio];
}

// ---------------------------------------------------------------------------
// Pontualidade
// ---------------------------------------------------------------------------

export type PedidoEntregue = {
  numero: number;
  /** Prazo combinado com o cliente. */
  prazo: Date | null;
  /** Quando de fato foi entregue. */
  entregueEm: Date;
};

export type Pontualidade = {
  entregues: number;
  noPrazo: number;
  atrasados: number;
  /** Percentual inteiro de pedidos entregues dentro do prazo. */
  percentualNoPrazo: number | null;
  /** Atraso médio, em dias, contando SÓ os que atrasaram. */
  atrasoMedioDias: number | null;
  /** O pior atraso do período, para não esconder o caso extremo na média. */
  piorAtraso: { numero: number; dias: number } | null;
};

/**
 * Entrego no prazo?
 *
 * Pedido sem prazo combinado fica de fora da conta: não dá para atrasar o que
 * não foi prometido, e incluí-lo como "no prazo" inflaria o número.
 */
export function calcularPontualidade(pedidos: PedidoEntregue[]): Pontualidade {
  const comPrazo = pedidos.filter((p): p is PedidoEntregue & { prazo: Date } => p.prazo !== null);

  let noPrazo = 0;
  const atrasos: { numero: number; dias: number }[] = [];

  for (const pedido of comPrazo) {
    // Comparação por DIA: entregar às 18h de uma data prometida para aquele dia
    // é no prazo, não um atraso de algumas horas.
    const prazoFim = new Date(pedido.prazo.getFullYear(), pedido.prazo.getMonth(), pedido.prazo.getDate(), 23, 59, 59);
    if (pedido.entregueEm <= prazoFim) {
      noPrazo++;
    } else {
      atrasos.push({ numero: pedido.numero, dias: Math.ceil(emDias(prazoFim, pedido.entregueEm)) });
    }
  }

  const pior = atrasos.length > 0 ? atrasos.reduce((a, b) => (b.dias > a.dias ? b : a)) : null;

  return {
    entregues: comPrazo.length,
    noPrazo,
    atrasados: atrasos.length,
    percentualNoPrazo: comPrazo.length > 0 ? Math.round((noPrazo / comPrazo.length) * 100) : null,
    atrasoMedioDias: media(atrasos.map((a) => a.dias)),
    piorAtraso: pior,
  };
}

// ---------------------------------------------------------------------------
// Tempo por etapa: onde o pedido fica parado
// ---------------------------------------------------------------------------

export type MovimentoEtapa = {
  orderId: string;
  /** Etapa de onde saiu. Null na primeira movimentação. */
  de: string | null;
  para: string;
  quando: Date;
};

export type TempoEtapa = {
  etapa: string;
  /** Quantas vezes um pedido passou por aqui e saiu. */
  passagens: number;
  mediaDias: number;
  medianaDias: number;
  /** Total de dias acumulados nesta etapa: revela o gargalo real. */
  totalDias: number;
};

/**
 * Quanto tempo o pedido passa em cada etapa.
 *
 * O tempo de uma etapa é a distância entre a chegada nela e a saída para a
 * seguinte. A última etapa de cada pedido não conta: ele ainda está lá, e
 * fechar a conta agora daria um tempo menor do que o real.
 */
export function calcularTempoPorEtapa(movimentos: MovimentoEtapa[]): TempoEtapa[] {
  // Agrupa por pedido e ordena no tempo: sem isso, movimentos fora de ordem
  // gerariam duração negativa.
  const porPedido = new Map<string, MovimentoEtapa[]>();
  for (const m of movimentos) {
    const lista = porPedido.get(m.orderId) ?? [];
    lista.push(m);
    porPedido.set(m.orderId, lista);
  }

  const duracoes = new Map<string, number[]>();

  for (const lista of porPedido.values()) {
    const ordenado = [...lista].sort((a, b) => a.quando.getTime() - b.quando.getTime());
    for (let i = 0; i < ordenado.length - 1; i++) {
      const entrouEm = ordenado[i].para;
      const dias = emDias(ordenado[i].quando, ordenado[i + 1].quando);
      if (dias < 0) continue; // dado inconsistente: ignora em vez de poluir a média
      const atual = duracoes.get(entrouEm) ?? [];
      atual.push(dias);
      duracoes.set(entrouEm, atual);
    }
  }

  return [...duracoes.entries()]
    .map(([etapa, dias]) => ({
      etapa,
      passagens: dias.length,
      mediaDias: media(dias) ?? 0,
      medianaDias: mediana(dias) ?? 0,
      totalDias: dias.reduce((s, d) => s + d, 0),
    }))
    .sort((a, b) => b.totalDias - a.totalDias);
}

/** A etapa que mais segura pedido. Null quando não há movimentação. */
export function gargalo(tempos: TempoEtapa[]): TempoEtapa | null {
  return tempos[0] ?? null;
}

// ---------------------------------------------------------------------------
// Tempo total do pedido
// ---------------------------------------------------------------------------

/**
 * Do primeiro registro até a entrega, em dias.
 *
 * É o número que o dono usa para prometer prazo: "boné leva uns 12 dias".
 */
export function calcularTempoTotal(
  pedidos: { inicio: Date; fim: Date }[],
): { mediaDias: number | null; medianaDias: number | null; maisRapido: number | null; maisLento: number | null } {
  const dias = pedidos.map((p) => emDias(p.inicio, p.fim)).filter((d) => d >= 0);
  return {
    mediaDias: media(dias),
    medianaDias: mediana(dias),
    maisRapido: dias.length > 0 ? Math.min(...dias) : null,
    maisLento: dias.length > 0 ? Math.max(...dias) : null,
  };
}

// ---------------------------------------------------------------------------
// Pedido parado: o que ninguém tocou
// ---------------------------------------------------------------------------

export type PedidoEmAndamento = {
  numero: number;
  cliente: string;
  /** Etapa em que o pedido está agora. */
  etapa: string | null;
  /** Última vez que mudou de etapa. Null quando nunca saiu de onde entrou. */
  ultimaMudanca: Date | null;
  /** Data de entrada no sistema, usada quando o pedido nunca mudou de etapa. */
  entrouEm: Date;
};

export type PedidoParado = {
  numero: number;
  cliente: string;
  etapa: string;
  diasParado: number;
  /** Nunca saiu da etapa inicial: costuma ser pedido esquecido na entrada. */
  nuncaMoveu: boolean;
};

/** Dias sem tocar num pedido antes de ele virar aviso. */
export const DIAS_PARA_PEDIDO_PARADO = 7;

/**
 * Pedidos que estão há dias na mesma etapa.
 *
 * Diferente de "atrasado": o atraso só aparece quando o prazo já passou, e
 * quem descobre nessa hora descobre tarde. Este aqui pega o pedido que parou
 * ANTES de o prazo estourar — e pega também o que nem prazo tem, que hoje
 * simplesmente some da vista de todo mundo.
 *
 * A referência é a última mudança de etapa; quem nunca mudou conta a partir da
 * entrada, senão o pedido esquecido no dia em que foi lançado nunca apareceria.
 */
export function pedidosParados(
  pedidos: PedidoEmAndamento[],
  limiteDias: number = DIAS_PARA_PEDIDO_PARADO,
  agora: Date = new Date(),
): PedidoParado[] {
  const parados: PedidoParado[] = [];

  for (const pedido of pedidos) {
    const referencia = pedido.ultimaMudanca ?? pedido.entrouEm;
    const dias = emDias(referencia, agora);
    // Data no futuro (relógio da máquina errado) sairia como parado há -3 dias.
    if (dias < limiteDias) continue;

    parados.push({
      numero: pedido.numero,
      cliente: pedido.cliente,
      etapa: pedido.etapa ?? "Sem etapa",
      diasParado: Math.floor(dias),
      nuncaMoveu: pedido.ultimaMudanca === null,
    });
  }

  return parados.sort((a, b) => b.diasParado - a.diasParado);
}

// ---------------------------------------------------------------------------
// Produtividade da bancada
// ---------------------------------------------------------------------------

export type TarefaConcluida = {
  pessoa: string;
  etapa: string | null;
  pegouEm: Date;
  concluiuEm: Date;
};

export type ProdutividadePessoa = {
  pessoa: string;
  concluidas: number;
  /** Horas médias entre pegar e concluir. */
  horasMedias: number;
};

export function calcularProdutividade(tarefas: TarefaConcluida[]): ProdutividadePessoa[] {
  const porPessoa = new Map<string, number[]>();
  for (const t of tarefas) {
    const horas = (t.concluiuEm.getTime() - t.pegouEm.getTime()) / 3600000;
    if (horas < 0) continue;
    const atual = porPessoa.get(t.pessoa) ?? [];
    atual.push(horas);
    porPessoa.set(t.pessoa, atual);
  }

  return [...porPessoa.entries()]
    .map(([pessoa, horas]) => ({
      pessoa,
      concluidas: horas.length,
      horasMedias: media(horas) ?? 0,
    }))
    .sort((a, b) => b.concluidas - a.concluidas);
}

// ---------------------------------------------------------------------------
// Problemas registrados na bancada
// ---------------------------------------------------------------------------

export type Problema = { tipo: string; etapa: string | null; pessoa: string; quando: Date; nota: string | null };

export type ResumoProblemas = {
  total: number;
  faltas: number;
  sobras: number;
  /** Etapa onde mais se registra problema. */
  etapaCritica: { etapa: string; ocorrencias: number } | null;
};

/**
 * Falta e sobra de material, anotadas por quem estava produzindo.
 *
 * Este dado já era coletado na bancada e nunca aparecia em lugar nenhum. Falta
 * repetida na mesma etapa costuma ser ficha técnica errada, não descuido.
 */
export function resumirProblemas(problemas: Problema[]): ResumoProblemas {
  const porEtapa = new Map<string, number>();
  let faltas = 0;
  let sobras = 0;

  for (const p of problemas) {
    if (p.tipo === "SHORTAGE") faltas++;
    else if (p.tipo === "SURPLUS") sobras++;
    const chave = p.etapa ?? "Sem etapa";
    porEtapa.set(chave, (porEtapa.get(chave) ?? 0) + 1);
  }

  const critica = [...porEtapa.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    total: problemas.length,
    faltas,
    sobras,
    etapaCritica: critica ? { etapa: critica[0], ocorrencias: critica[1] } : null,
  };
}

// ---------------------------------------------------------------------------
// Leitura em português
// ---------------------------------------------------------------------------

/** "3 dias e 4 h" — número cru em dias não se lê bem numa oficina. */
export function lerDias(dias: number | null): string {
  if (dias === null) return "sem dados";
  if (dias < 1) {
    const horas = Math.round(dias * 24);
    return horas <= 1 ? "menos de 1 hora" : `${horas} horas`;
  }
  const inteiros = Math.floor(dias);
  const horas = Math.round((dias - inteiros) * 24);
  const parteDias = `${inteiros} dia${inteiros === 1 ? "" : "s"}`;
  return horas > 0 ? `${parteDias} e ${horas} h` : parteDias;
}

/** Avaliação da pontualidade, em frase. */
export function lerPontualidade(percentual: number | null): string {
  if (percentual === null) return "nenhuma entrega com prazo combinado no período";
  if (percentual >= 95) return "praticamente tudo no prazo";
  if (percentual >= 80) return "a maioria no prazo";
  if (percentual >= 60) return "atraso frequente";
  return "atraso é a regra, não a exceção";
}
