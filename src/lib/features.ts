// Módulos vendáveis do ConfecControl. O "núcleo" (Dashboard, Clientes, Produtos,
// Pedidos, Configurações, Conta) é sempre incluso e não entra nesta lista.
// Client-safe: sem imports de servidor, pode ser usado em componentes "use client".

export type FeatureKey =
  | "producao"
  | "estoque"
  | "financeiro"
  | "relatorios"
  | "terceirizadas"
  | "equipe";

export const sellableFeatures: {
  key: FeatureKey;
  label: string;
  description: string;
  route: string;
}[] = [
  { key: "producao", label: "Quadro de produção", description: "Kanban por etapa: corte, costura, acabamento, entrega.", route: "/producao" },
  { key: "estoque", label: "Estoque e ficha técnica", description: "Materiais, baixa automática por pedido e alerta de mínimo.", route: "/estoque" },
  { key: "financeiro", label: "Financeiro", description: "Contas a receber, entradas, saldos e pagamentos.", route: "/financeiro" },
  { key: "relatorios", label: "Relatórios", description: "Faturamento, lucro e rankings de clientes e peças.", route: "/relatorios" },
  { key: "terceirizadas", label: "Terceirizadas", description: "Cadastro e envio de pedidos para facções parceiras.", route: "/terceirizadas" },
  { key: "equipe", label: "Vários funcionários", description: "Mais de um login, com cargos e acessos por pessoa.", route: "/usuarios" },
];

export const featureKeys: FeatureKey[] = sellableFeatures.map((feature) => feature.key);

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
