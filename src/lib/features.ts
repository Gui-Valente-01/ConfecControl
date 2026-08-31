// Módulos vendáveis do ConfecControl. O "núcleo" (Dashboard, Clientes, Produtos,
// Pedidos, Configurações, Conta) é sempre incluso e não entra nesta lista.
// Client-safe: sem imports de servidor, pode ser usado em componentes "use client".

export type FeatureKey =
  | "producao"
  | "estoque"
  | "financeiro"
  | "relatorios"
  | "terceirizadas"
  | "equipe"
  | "portal"
  | "bancada";

export const sellableFeatures: {
  key: FeatureKey;
  label: string;
  description: string;
  route: string;
  /**
   * Falso enquanto o módulo existir no sistema mas não puder ser anunciado como
   * pronto. Módulo listado aqui vira automaticamente vitrine em /planos e nas
   * páginas por segmento — foi assim que um módulo incompleto já apareceu à
   * venda sem existir de verdade.
   */
  anunciavel?: boolean;
}[] = [
  { key: "producao", label: "Quadro de produção", description: "Kanban por etapa: corte, costura, acabamento, entrega.", route: "/producao" },
  { key: "estoque", label: "Estoque de peças", description: "Quantidade na prateleira, baixa automática por pedido e alerta de mínimo.", route: "/estoque" },
  { key: "financeiro", label: "Financeiro", description: "Contas a receber, entradas, saldos e pagamentos.", route: "/financeiro" },
  { key: "relatorios", label: "Relatórios", description: "Faturamento, lucro e rankings de clientes e peças.", route: "/relatorios" },
  { key: "terceirizadas", label: "Terceirizadas", description: "Cadastro e envio de pedidos para facções parceiras.", route: "/terceirizadas" },
  { key: "equipe", label: "Vários funcionários", description: "Mais de um login, com cargos e acessos por pessoa.", route: "/usuarios" },
  { key: "portal", label: "Portal do cliente", description: "O cliente acompanha pedidos e envia solicitações que você aprova.", route: "/solicitacoes" },
  { key: "bancada", label: "Bancada (chão de fábrica)", description: "Funcionário pega o pedido, marca a mesa e conclui, com controle por mesa.", route: "/bancada" },
];

export const featureKeys: FeatureKey[] = sellableFeatures.map((feature) => feature.key);

/**
 * O que pode aparecer em página pública de venda.
 *
 * Toda vitrine deve ler daqui, nunca de sellableFeatures: a lista completa
 * inclui módulo que ainda não está pronto para ser prometido a quem compra.
 */
export const publicFeatures = sellableFeatures.filter((feature) => feature.anunciavel !== false);

// Combinações prontas por tipo de confecção. São só atalhos: depois de aplicar
// um plano dá para marcar/desmarcar qualquer módulo à mão, porque cada cliente
// acaba pedindo um ajuste próprio.
export const featurePresets: {
  key: string;
  label: string;
  who: string;
  features: FeatureKey[];
}[] = [
  {
    key: "essencial",
    label: "Essencial",
    who: "Ateliê, costureira autônoma, sob medida",
    features: ["financeiro"],
  },
  {
    key: "producao",
    label: "Produção",
    who: "Serigrafia, estamparia, facção",
    features: ["producao", "bancada", "estoque", "financeiro", "equipe"],
  },
  {
    key: "completo",
    label: "Completo",
    who: "Marca própria, uniformes, quem terceiriza",
    features: publicFeatures.map((feature) => feature.key),
  },
];

const routeToFeature: Record<string, FeatureKey> = Object.fromEntries(
  sellableFeatures.map((feature) => [feature.route, feature.key]),
) as Record<string, FeatureKey>;

// A empresa tem o módulo se ele estiver na lista dela. Núcleo não passa por aqui.
export function planHasFeature(features: string[] | null | undefined, key: FeatureKey): boolean {
  return Array.isArray(features) && features.includes(key);
}

// Rotas do núcleo (não mapeadas) são sempre liberadas; as demais dependem do plano.
export function planAllowsRoute(features: string[] | null | undefined, href: string): boolean {
  const key = routeToFeature[href];
  if (!key) return true;
  return planHasFeature(features, key);
}

// Filtra uma lista de valores mantendo só chaves de módulo válidas (entrada de formulário).
export function sanitizeFeatures(values: string[]): FeatureKey[] {
  return featureKeys.filter((key) => values.includes(key));
}

export function featureLabel(key: string): string {
  return sellableFeatures.find((feature) => feature.key === key)?.label ?? key;
}
