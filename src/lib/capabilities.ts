// O que cada cargo pode FAZER, e não só quais telas ele abre.
//
// Antes disso a autorização morava em dois lugares incompletos: uma lista de
// rotas por cargo (roles.ts) e um punhado de funções soltas (canSeeFinance,
// canManageOrders...). Quem entrasse por fora de uma tela não passava por
// nenhum dos dois — e era exatamente o caso do export de relatórios, que
// devolvia o total e o pago de todos os pedidos para qualquer pessoa logada,
// inclusive a Produção, que o próprio sistema proíbe de ver dinheiro.
//
// Aqui a pergunta deixa de ser "essa pessoa abriu a tela certa?" e passa a ser
// "essa pessoa pode executar esta operação?". Toda página, Server Action e
// Route Handler pergunta isso ao servidor. Esconder o botão não é proteção:
// o botão escondido continua sendo uma URL que alguém digita.
//
// Client-safe: sem imports de servidor, pode ser usado em componentes "use client".

import type { UserRole } from "@prisma/client";

export type Capability =
  // Cadastros
  | "clients.read"
  | "clients.write"
  | "products.read"
  | "products.write"
  // Pedidos
  | "orders.read"
  | "orders.write"
  | "orders.print"
  // Produção
  | "production.read"
  | "production.write"
  | "bancada.use"
  | "bancada.history"
  // Estoque
  | "stock.read"
  | "stock.write"
  // Dinheiro
  | "finance.read"
  | "finance.write"
  // Relatórios
  | "reports.read"
  | "reports.export"
  // Parceiros e equipe
  | "partners.read"
  | "partners.write"
  | "team.read"
  | "team.write"
  // Configuração e lixeira
  | "settings.read"
  | "settings.write"
  | "trash.read"
  | "trash.restore"
  | "trash.purge"
  // Portal do cliente
  | "requests.manage"
  // Fiscal (NF-e)
  | "fiscal.read"
  | "fiscal.issue"
  | "fiscal.cancel";

/**
 * A matriz.
 *
 * O Dono é o único com tudo. As demais linhas foram escritas para preservar o
 * que o sistema já fazia — a mudança aqui é de lugar, não de regra, para o
 * ajuste de segurança não virar surpresa para quem já usa o sistema todo dia.
 *
 * As exceções que valem explicação:
 *
 *   Produção não tem NADA de dinheiro, relatório, configuração ou fiscal. Ela
 *   lê pedidos e estoque para saber o que produzir, e trabalha na bancada.
 *   Pode imprimir a ficha (a oficina precisa do papel), mas a impressão sai
 *   sem os valores — quem decide isso é a capacidade finance.read, na tela.
 *
 *   Gerente faz quase tudo, menos mexer em funcionário, esvaziar a lixeira de
 *   vez e emitir ou cancelar nota. No fiscal ele apenas acompanha.
 *
 *   Vendas cuida de cliente, peça e pedido. Não vê dinheiro nem relatório, e
 *   por isso também não exporta.
 */
const matriz: Record<UserRole, Capability[] | "todas"> = {
  ADMIN: "todas",

  MANAGER: [
    "clients.read", "clients.write",
    "products.read", "products.write",
    "orders.read", "orders.write", "orders.print",
    "production.read", "production.write",
    "bancada.use", "bancada.history",
    "stock.read", "stock.write",
    "finance.read", "finance.write",
    "reports.read", "reports.export",
    "partners.read", "partners.write",
    "team.read",
    "settings.read", "settings.write",
    "trash.read", "trash.restore",
    "requests.manage",
    "fiscal.read",
  ],

  PRODUCTION: [
    "orders.read", "orders.print",
    "production.read",
    "bancada.use",
    "stock.read",
  ],

  FINANCE: [
    "clients.read", "clients.write",
    "orders.read", "orders.write", "orders.print",
    "finance.read", "finance.write",
    "reports.read", "reports.export",
    "fiscal.read", "fiscal.issue", "fiscal.cancel",
  ],

  SALES: [
    "clients.read", "clients.write",
    "products.read", "products.write",
    "orders.read", "orders.write", "orders.print",
    "requests.manage",
  ],
};

/** O cargo pode executar esta operação? */
export function roleHasCapability(role: UserRole, capability: Capability): boolean {
  const permitidas = matriz[role];
  if (permitidas === "todas") return true;
  return permitidas.includes(capability);
}

/** Todas as capacidades de um cargo. Útil para montar menu e para os testes. */
export function capabilitiesOf(role: UserRole): Capability[] {
  const permitidas = matriz[role];
  return permitidas === "todas" ? [...TODAS_AS_CAPACIDADES] : [...permitidas];
}

// A lista completa existe para o ADMIN e para o teste conseguir varrer a matriz
// inteira. Fica derivada da própria matriz para não haver duas listas para
// manter em dia: capacidade nova esquecida aqui seria capacidade sem teste.
export const TODAS_AS_CAPACIDADES: Capability[] = [
  "clients.read", "clients.write",
  "products.read", "products.write",
  "orders.read", "orders.write", "orders.print",
  "production.read", "production.write",
  "bancada.use", "bancada.history",
  "stock.read", "stock.write",
  "finance.read", "finance.write",
  "reports.read", "reports.export",
  "partners.read", "partners.write",
  "team.read", "team.write",
  "settings.read", "settings.write",
  "trash.read", "trash.restore", "trash.purge",
  "requests.manage",
  "fiscal.read", "fiscal.issue", "fiscal.cancel",
];

/**
 * A capacidade mínima para abrir cada rota.
 *
 * Substitui a lista de rotas por cargo: agora rota e operação respondem à
 * mesma pergunta, e não há como uma dizer sim enquanto a outra diz não.
 */
export const CAPACIDADE_DA_ROTA: Record<string, Capability> = {
  "/clientes": "clients.read",
  "/produtos": "products.read",
  "/pedidos": "orders.read",
  "/producao": "production.read",
  "/bancada": "bancada.use",
  "/bancada/historico": "bancada.history",
  "/estoque": "stock.read",
  "/financeiro": "finance.read",
  "/relatorios": "reports.read",
  "/terceirizadas": "partners.read",
  "/usuarios": "team.read",
  "/configuracoes": "settings.read",
  "/lixeira": "trash.read",
  "/solicitacoes": "requests.manage",
  "/fiscal": "fiscal.read",
};

/**
 * O cargo pode abrir esta rota?
 *
 * Rota sem capacidade declarada é do núcleo (painel, busca, conta, avisos) e
 * fica liberada para quem está logado — o que cada uma mostra continua sendo
 * filtrado por empresa e por capacidade dentro da própria tela.
 */
export function roleCanOpenRoute(role: UserRole, href: string): boolean {
  const necessaria = CAPACIDADE_DA_ROTA[href];
  if (!necessaria) return true;
  return roleHasCapability(role, necessaria);
}
