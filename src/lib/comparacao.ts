// Comparação com o período anterior. Sem banco e sem React, para permitir teste.
//
// "Faturei R$ 23 mil" não diz nada sozinho. Ao lado de "no mês passado foram
// R$ 18 mil", vira informação: subiu, e quanto. Sem isso o dono olha o número,
// não sabe se é bom ou ruim, e a tela inteira vira enfeite.
//
// A comparação é sempre com o MESMO tamanho de período imediatamente anterior:
// comparar 30 dias com 7 daria uma queda que não existe.

export type Periodo = { de: Date; ate: Date };

/**
 * O período anterior, do mesmo tamanho, terminando onde o atual começa.
 *
 * Exemplo: 1 a 31 de agosto devolve 1 a 31 de julho (mesmos 31 dias).
 */
export function periodoAnterior(periodo: Periodo): Periodo {
  const duracao = periodo.ate.getTime() - periodo.de.getTime();
  const ate = new Date(periodo.de.getTime() - 1);
  const de = new Date(ate.getTime() - duracao);
  return { de, ate };
}

export type Variacao = {
  /** Diferença absoluta, na mesma unidade do valor (centavos, unidades...). */
  diferenca: number;
  /** Percentual arredondado. Null quando não dá para calcular (base zero). */
  percentual: number | null;
  direcao: "subiu" | "caiu" | "igual";
  /** Havia com o que comparar? Falso no primeiro período de uso do sistema. */
  temBase: boolean;
};

export function compararValores(atual: number, anterior: number): Variacao {
  const diferenca = atual - anterior;
  const direcao = diferenca > 0 ? "subiu" : diferenca < 0 ? "caiu" : "igual";

  // Sem base não existe percentual: dividir por zero daria "infinito por cento",
  // e escrever "+100%" quando antes era zero seria mentira — não subiu 100%,
  // simplesmente não havia nada antes.
  if (anterior === 0) {
    return { diferenca, percentual: null, direcao, temBase: false };
  }

  return {
    diferenca,
    percentual: Math.round((diferenca / Math.abs(anterior)) * 100),
    direcao,
    temBase: true,
  };
}

/**
 * Texto curto da comparação, para ficar embaixo do número.
 *
 * `formatar` transforma o valor bruto em texto (dinheiro, unidades...), para a
 * mesma função servir a faturamento e a contagem de pedidos.
 */
export function textoVariacao(
  variacao: Variacao,
  formatar: (valor: number) => string,
): string {
  if (!variacao.temBase) {
    return variacao.diferenca === 0 ? "sem período anterior para comparar" : "primeiro período com movimento";
  }
  if (variacao.direcao === "igual") return "igual ao período anterior";

  const sinal = variacao.direcao === "subiu" ? "+" : "−";
  const absoluto = formatar(Math.abs(variacao.diferenca));
  const pct = Math.abs(variacao.percentual ?? 0);
  return `${sinal}${absoluto} (${sinal}${pct}%) vs período anterior`;
}

/**
 * A variação é boa ou ruim?
 *
 * Depende do que se mede: faturamento subindo é bom, pedido atrasado subindo é
 * ruim. Quem chama diz o que é melhor, em vez de a função adivinhar.
 */
export function tomDaVariacao(
  variacao: Variacao,
  melhor: "subir" | "cair",
): "bom" | "ruim" | "neutro" {
  if (!variacao.temBase || variacao.direcao === "igual") return "neutro";
  const subiu = variacao.direcao === "subiu";
  return subiu === (melhor === "subir") ? "bom" : "ruim";
}
