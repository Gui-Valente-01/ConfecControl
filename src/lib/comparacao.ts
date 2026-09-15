// Comparação com o período anterior. Sem banco e sem React, para permitir teste.
//
// "Faturei R$ 23 mil" não diz nada sozinho. Ao lado de "no mês passado foram
// R$ 18 mil", vira informação: subiu, e quanto. Sem isso o dono olha o número,
// não sabe se é bom ou ruim, e a tela inteira vira enfeite.
//
// A comparação é sempre com um período equivalente: comparar 30 dias com 7
// daria uma queda que não existe. Ver periodoAnterior.

import { diaEmBrasilia, inicioDoDia } from "@/lib/datas";

export type Periodo = { de: Date; ate: Date };

const DIA_MS = 86_400_000;

function ultimoDiaDoMes(ano: number, mes: number): number {
  return diaEmBrasilia(inicioDoDia({ ano, mes: mes + 1, dia: 0 })).dia;
}

/** Quanto do dia final o período cobre: fim do dia, ou "até agora". */
function horaDoFim(periodo: Periodo): number {
  return periodo.ate.getTime() - inicioDoDia(diaEmBrasilia(periodo.ate)).getTime();
}

/**
 * O período com que o atual deve ser comparado. Calendário de Brasília.
 *
 * - Mês inteiro (ou vários): os meses inteiros anteriores. Setembro (30 dias)
 *   compara com agosto inteiro (31), e não com "2 a 31 de agosto".
 * - Mês até hoje (1 a 14 de setembro): os mesmos dias do mês anterior
 *   (1 a 14 de agosto). Comparar com os 14 dias imediatamente antes daria a
 *   segunda quinzena de agosto, que não é o que o dono quer saber.
 * - Semana a partir da segunda: os mesmos dias da semana anterior. Segunda a
 *   quarta compara com segunda a quarta, e não com quinta a domingo.
 * - Qualquer outro intervalo: o mesmo tamanho, imediatamente antes.
 *
 * `tipo` diz de qual botão o período veio. Precisa, porque as datas sozinhas
 * são ambíguas: numa segunda-feira dia 1, "Esta semana" e "Este mês" são o
 * mesmo intervalo, mas uma compara com a semana passada e o outro com o mês
 * passado.
 */
export function periodoAnterior(periodo: Periodo, tipo: "semana" | "mes" | "mes-passado" | null = null): Periodo {
  const de = diaEmBrasilia(periodo.de);
  const ate = diaEmBrasilia(periodo.ate);
  const comecaNaMeiaNoite = periodo.de.getTime() === inicioDoDia(de).getTime();

  if (tipo === "semana") {
    return {
      de: new Date(periodo.de.getTime() - 7 * DIA_MS),
      ate: new Date(periodo.ate.getTime() - 7 * DIA_MS),
    };
  }

  if (comecaNaMeiaNoite && de.dia === 1) {
    const meses = (ate.ano - de.ano) * 12 + (ate.mes - de.mes);
    const inicioAnterior = diaEmBrasilia(inicioDoDia({ ano: de.ano, mes: de.mes - Math.max(1, meses + 1), dia: 1 }));

    // Termina no último dia de um mês: compara meses inteiros.
    if (ate.dia === ultimoDiaDoMes(ate.ano, ate.mes)) {
      const ultimoAnterior = diaEmBrasilia(inicioDoDia({ ano: de.ano, mes: de.mes, dia: 0 }));
      return {
        de: inicioDoDia(inicioAnterior),
        ate: new Date(inicioDoDia(ultimoAnterior).getTime() + horaDoFim(periodo)),
      };
    }

    // Mês até hoje: mesmos dias do mês anterior, cortando no fim dele (30 de
    // março compara com 1 a 28 de fevereiro).
    if (meses === 0) {
      const diaFinal = Math.min(ate.dia, ultimoDiaDoMes(inicioAnterior.ano, inicioAnterior.mes));
      return {
        de: inicioDoDia(inicioAnterior),
        ate: new Date(inicioDoDia({ ...inicioAnterior, dia: diaFinal }).getTime() + horaDoFim(periodo)),
      };
    }
  }

  // Semana a partir da segunda-feira, com até 7 dias: a mesma janela, uma
  // semana antes.
  const eSegunda = new Date(inicioDoDia(de).getTime() + 12 * 3_600_000).getUTCDay() === 1;
  if (comecaNaMeiaNoite && eSegunda && periodo.ate.getTime() - periodo.de.getTime() < 7 * DIA_MS) {
    return {
      de: new Date(periodo.de.getTime() - 7 * DIA_MS),
      ate: new Date(periodo.ate.getTime() - 7 * DIA_MS),
    };
  }

  const duracao = periodo.ate.getTime() - periodo.de.getTime();
  const fim = new Date(periodo.de.getTime() - 1);
  return { de: new Date(fim.getTime() - duracao), ate: fim };
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
