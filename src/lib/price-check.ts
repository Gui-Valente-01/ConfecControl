// Conferência de valor atípico. Sem banco e sem Next, para permitir teste.
//
// O erro que isso pega é o do ponto decimal: digitar 4500 onde a peça custa
// 45,00. O número entra sem reclamação, o pedido fecha com valor errado e a
// conversa com o cliente acontece semanas depois.
//
// A referência é o preço padrão cadastrado na peça. Sem preço padrão não há
// opinião a dar — melhor calar do que inventar um "normal" que não existe.

export type PriceCheckInput = {
  label: string;
  typedInCents: number;
  referenceInCents: number;
};

export type AtypicalPrice = PriceCheckInput & {
  times: number;
  direction: "acima" | "abaixo";
};

/**
 * O limite é folgado de propósito: 5x para cima ou para baixo. Desconto de
 * metade e cobrança do dobro são rotina numa confecção, e um aviso que aparece
 * toda hora vira um aviso que ninguém lê.
 */
export const FATOR_PADRAO = 5;

export function findAtypicalPrices(inputs: PriceCheckInput[], factor: number = FATOR_PADRAO): AtypicalPrice[] {
  if (factor <= 1) return [];

  return inputs.flatMap((input): AtypicalPrice[] => {
    // Sem referência não dá para comparar. Preço zerado costuma ser brinde ou
    // amostra, e avisar nesse caso só atrapalharia.
    if (input.referenceInCents <= 0 || input.typedInCents <= 0) return [];

    const times = input.typedInCents / input.referenceInCents;
    if (times >= factor) return [{ ...input, times, direction: "acima" as const }];
    if (times <= 1 / factor) return [{ ...input, times, direction: "abaixo" as const }];
    return [];
  });
}

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Quantas vezes de diferença, em texto curto: "10x" ou "12x". */
function formatTimes(atypical: AtypicalPrice): string {
  const fator = atypical.direction === "acima" ? atypical.times : 1 / atypical.times;
  return `${Math.round(fator)}x`;
}

/**
 * Texto do "confere aí?" antes de salvar. Mostra o que foi digitado e o preço
 * cadastrado lado a lado, porque é a comparação que revela o ponto no lugar
 * errado. Não bloqueia: o preço diferente pode ser proposital.
 */
export function describeAtypicalPrices(list: AtypicalPrice[]): string | null {
  if (list.length === 0) return null;

  const linhas = list.map(
    (item) =>
      `• ${item.label}: ${formatMoney(item.typedInCents)} — ${formatTimes(item)} ${item.direction} do preço cadastrado (${formatMoney(item.referenceInCents)})`,
  );

  const cabecalho =
    list.length === 1
      ? "Um valor está bem diferente do preço cadastrado:"
      : "Alguns valores estão bem diferentes do preço cadastrado:";

  return `${cabecalho}\n\n${linhas.join("\n")}\n\nConfira se a vírgula está no lugar certo. Se o preço é esse mesmo, pode salvar.`;
}
