// Grade: a mesma peça em vários tamanhos e cores, lançada de uma vez.
//
// Uniforme escolar não é "1 camiseta". É 12 do tamanho 8, 30 do 10, 25 do 12 —
// e às vezes isso em duas cores. Digitar item por item são doze linhas iguais
// mudando um número, e é onde o pedido sai errado.
//
// A grade NÃO é uma tabela nova no banco: cada célula preenchida vira um item
// normal do pedido, com tamanho, cor e quantidade próprios. Assim relatório,
// estoque, impressão e financeiro continuam funcionando sem saber que a grade
// existe — quem digita ganha tempo, e o resto do sistema não muda.

export type CelulaGrade = {
  cor: string;
  tamanho: string;
  quantidade: number;
};

/**
 * Quebra "P, M, G" ou "P M G" numa lista limpa.
 *
 * Quem usou vírgula mandou na separação; sem ela, o espaço separa. A regra
 * existe por causa das cores: "Azul Marinho, Verde Bandeira" são duas cores, e
 * separar por espaço viraria quatro. Já os tamanhos quase sempre vêm como
 * "P M G GG", sem vírgula nenhuma, e ali o espaço é o que a pessoa espera.
 *
 * Repetido sai fora: duas colunas "M" na mesma grade viram duas linhas iguais
 * no pedido.
 */
export function separarLista(texto: string): string[] {
  const bruto = String(texto ?? "");
  const temSeparadorForte = /[,;\n\t]/.test(bruto);

  const partes = bruto
    .split(temSeparadorForte ? /[,;\n\t]+/ : /\s+/)
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);

  const vistos = new Set<string>();
  const lista: string[] = [];
  for (const parte of partes) {
    // A comparação ignora maiúsculas para "P" e "p" não virarem duas colunas,
    // mas o que fica na tela é o que a pessoa digitou.
    const chave = parte.toLocaleLowerCase("pt-BR");
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    lista.push(parte);
  }
  return lista;
}

/** Identifica uma célula no mapa de quantidades. */
export function chaveCelula(cor: string, tamanho: string): string {
  return JSON.stringify([cor, tamanho]);
}

/**
 * As células que viraram peça de verdade.
 *
 * Sem cor informada, a grade tem uma faixa só — é o caso de quem trabalha com
 * uma cor por pedido e só precisa dos tamanhos. Célula vazia ou zerada não
 * entra: a grade é uma matriz de possibilidades, e o pedido só quer o que foi
 * pedido.
 */
export function celulasPreenchidas(
  cores: string[],
  tamanhos: string[],
  quantidades: Record<string, number | string>,
): CelulaGrade[] {
  const faixas = cores.length > 0 ? cores : [""];
  const celulas: CelulaGrade[] = [];

  for (const cor of faixas) {
    for (const tamanho of tamanhos) {
      const bruto = quantidades[chaveCelula(cor, tamanho)];
      const quantidade = Math.floor(Number(bruto) || 0);
      if (quantidade <= 0) continue;
      celulas.push({ cor, tamanho, quantidade });
    }
  }

  return celulas;
}

/** Quantas peças a grade soma. É o número que confere com o pedido do cliente. */
export function totalDaGrade(celulas: CelulaGrade[]): number {
  return celulas.reduce((soma, celula) => soma + celula.quantidade, 0);
}

/**
 * Conjuntos de tamanho que se repetem em quase toda confecção.
 *
 * Existem para a pessoa não digitar "2 4 6 8 10 12 14" na mão toda vez. Nada
 * impede digitar outra coisa: é atalho, não regra.
 */
export const GRADES_SUGERIDAS: { rotulo: string; tamanhos: string }[] = [
  { rotulo: "Adulto", tamanhos: "P M G GG" },
  { rotulo: "Adulto + extras", tamanhos: "PP P M G GG XG" },
  { rotulo: "Infantil", tamanhos: "2 4 6 8 10 12 14" },
  { rotulo: "Numérico", tamanhos: "36 38 40 42 44 46" },
];
