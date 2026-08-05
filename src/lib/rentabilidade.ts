// Quem e o que dá lucro. Sem banco e sem React, para permitir teste.
//
// O relatório mostrava "quem mais compra" por faturamento. Isso engana: um
// cliente que compra muito com margem apertada pode valer menos que um pequeno
// com margem boa — e a tela sugeria o contrário, colocando o primeiro no topo.
//
// Aqui a ordem é por lucro, e a margem aparece do lado. É a conta que responde
// "vale a pena continuar fazendo isso?".

export type LinhaVendida = {
  /** Chave de agrupamento: nome do cliente, ou id/descrição da peça. */
  chave: string;
  rotulo: string;
  quantidade: number;
  receitaInCents: number;
  /** Custo já multiplicado pela quantidade. Zero = custo não cadastrado. */
  custoInCents: number;
};

export type Rentabilidade = {
  rotulo: string;
  quantidade: number;
  receitaInCents: number;
  custoInCents: number;
  lucroInCents: number;
  /** Margem em porcentagem inteira. Null quando não há receita para dividir. */
  margem: number | null;
  /** O custo desta linha está incompleto? A margem então está otimista. */
  custoIncompleto: boolean;
};

/**
 * Junta as linhas por chave e calcula o lucro de cada grupo.
 *
 * Linha com custo zerado marca o grupo como incompleto: sem isso a margem
 * apareceria como 100% e o dono acharia que aquela peça é a mais lucrativa da
 * casa, quando na verdade ninguém cadastrou o custo dela.
 */
export function agruparRentabilidade(linhas: LinhaVendida[]): Rentabilidade[] {
  const mapa = new Map<string, Rentabilidade>();

  for (const linha of linhas) {
    const atual = mapa.get(linha.chave) ?? {
      rotulo: linha.rotulo,
      quantidade: 0,
      receitaInCents: 0,
      custoInCents: 0,
      lucroInCents: 0,
      margem: null,
      custoIncompleto: false,
    };

    atual.quantidade += linha.quantidade;
    atual.receitaInCents += linha.receitaInCents;
    atual.custoInCents += linha.custoInCents;
    // Receita sem custo é o sinal: alguém vendeu sem saber quanto gastou.
    if (linha.custoInCents === 0 && linha.receitaInCents > 0) atual.custoIncompleto = true;

    mapa.set(linha.chave, atual);
  }

  for (const item of mapa.values()) {
    item.lucroInCents = item.receitaInCents - item.custoInCents;
    item.margem = item.receitaInCents > 0
      ? Math.round((item.lucroInCents / item.receitaInCents) * 100)
      : null;
  }

  return [...mapa.values()];
}

/** Do que mais dá lucro para o que menos dá. */
export function ordenarPorLucro(linhas: Rentabilidade[]): Rentabilidade[] {
  return [...linhas].sort((a, b) => b.lucroInCents - a.lucroInCents);
}

/**
 * O que está dando prejuízo: vendido por menos do que custou.
 *
 * É a lista mais útil da tela e a que não existia. Peça vendida no prejuízo
 * passa despercebida no meio do faturamento, porque o total continua subindo.
 */
export function noPrejuizo(linhas: Rentabilidade[]): Rentabilidade[] {
  return linhas
    .filter((l) => !l.custoIncompleto && l.lucroInCents < 0)
    .sort((a, b) => a.lucroInCents - b.lucroInCents);
}

/** Frase curta sobre a margem, para quem não lê porcentagem com facilidade. */
export function lerMargem(margem: number | null, custoIncompleto: boolean): string {
  if (custoIncompleto) return "custo incompleto — a margem está otimista";
  if (margem === null) return "sem receita no período";
  if (margem < 0) return "está saindo no prejuízo";
  if (margem < 15) return "margem apertada";
  if (margem < 35) return "margem normal";
  return "margem boa";
}
