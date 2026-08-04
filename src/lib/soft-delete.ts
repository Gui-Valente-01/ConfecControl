// Filtro da lixeira, aplicado de uma vez para todas as consultas.
//
// São 37 leituras espalhadas por telas e relatórios nesses cinco cadastros.
// Filtrar uma a uma erraria alguma, e o erro seria silencioso: um cadastro
// apagado voltaria a aparecer numa tela só, e ninguém entenderia por quê.
//
// Aqui a regra é uma: leitura desses modelos só enxerga o que não foi apagado,
// a menos que quem chamou peça explicitamente o contrário — que é como a tela
// da lixeira consegue listar o que está lá dentro.

/** Cadastros que vão para a lixeira em vez de sumir. */
export const MODELOS_COM_LIXEIRA = ["Client", "Product", "Material", "Partner", "Service"] as const;

export type ModeloComLixeira = (typeof MODELOS_COM_LIXEIRA)[number];

const MODELOS = new Set<string>(MODELOS_COM_LIXEIRA);

export function temLixeira(model: string | undefined): boolean {
  return Boolean(model && MODELOS.has(model));
}

/**
 * Operações de leitura que devem esconder o que está na lixeira.
 *
 * findUnique e findUniqueOrThrow ficam de fora de propósito: o `where` delas
 * só aceita campo único, e enfiar `deletedAt` ali é pedir erro em tempo de
 * execução. Os poucos lugares que as usam são o login do portal do cliente,
 * e lá a checagem está escrita na mão — é o tipo de coisa que fica melhor
 * explícita do que escondida numa extensão.
 */
const LEITURAS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

export function eLeitura(operation: string): boolean {
  return LEITURAS.has(operation);
}

type ArgsComWhere = { where?: Record<string, unknown> } | undefined;

/**
 * Acrescenta `deletedAt: null` ao where, se quem chamou não falou de deletedAt.
 *
 * A exceção é o que faz a tela da lixeira funcionar: pedindo `deletedAt` na
 * mão, a consulta enxerga os apagados. Fora dali, ninguém precisa saber que a
 * coluna existe.
 */
export function aplicarFiltro<T extends ArgsComWhere>(args: T): T {
  const atual = args ?? ({} as NonNullable<T>);
  const where = (atual as { where?: Record<string, unknown> }).where;

  // Quem falou de deletedAt sabe o que está fazendo: não mexemos.
  if (where && "deletedAt" in where) return atual as T;

  return { ...atual, where: { ...(where ?? {}), deletedAt: null } } as T;
}
