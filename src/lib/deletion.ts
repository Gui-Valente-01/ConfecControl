// Mensagens de exclusão. Sem banco e sem Next, para permitir teste.
//
// Antes toda exclusão dizia a mesma coisa: "Esta ação não pode ser desfeita."
// Isso não ajuda ninguém a decidir. O que a pessoa precisa saber é o que sai
// junto: apagar um material tira ele da ficha técnica das peças e leva embora
// o histórico de entrada e saída do estoque.
//
// E há casos em que a exclusão simplesmente não pode acontecer, porque
// apagaria o passado: cliente com pedido, peça já vendida. Nesses casos o
// certo é explicar o motivo e o número, não deixar o banco estourar um erro
// que ninguém entende.

export type DeletionImpact = {
  count: number;
  singular: string;
  plural: string;
};

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function relevantes(impacts: DeletionImpact[]): DeletionImpact[] {
  return impacts.filter((impact) => impact.count > 0);
}

/**
 * Texto do "tem certeza?", com o tipo, o nome e o que some junto.
 * Sem impacto nenhum, fica na frase curta: não vale assustar à toa.
 */
export function describeDeletion(input: {
  tipo: string;
  nome: string;
  apaga?: DeletionImpact[];
}): string {
  const cabecalho = `Excluir ${input.tipo} "${input.nome}"?`;
  const impactos = relevantes(input.apaga ?? []);

  if (impactos.length === 0) {
    return `${cabecalho}\n\nNão dá para desfazer.`;
  }

  const linhas = impactos.map((impact) => `• ${pluralize(impact.count, impact.singular, impact.plural)}`);
  return `${cabecalho}\n\nIsso apaga junto:\n${linhas.join("\n")}\n\nNão dá para desfazer.`;
}

/**
 * Texto do erro quando a exclusão apagaria histórico e por isso é recusada.
 * Diz o número e o que fazer antes, para a pessoa não ficar travada.
 */
export function describeBlockedDeletion(input: {
  tipo: string;
  nome: string;
  bloqueios: DeletionImpact[];
  saida: string;
}): string | null {
  const impactos = relevantes(input.bloqueios);
  if (impactos.length === 0) return null;

  const lista = impactos
    .map((impact) => pluralize(impact.count, impact.singular, impact.plural))
    .join(" e ");

  return `Não dá para excluir ${input.tipo} "${input.nome}": há ${lista} usando esse cadastro. ${input.saida}`;
}
