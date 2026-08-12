import type { UserRole } from "@prisma/client";

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Dono",
  MANAGER: "Gerente",
  PRODUCTION: "Produção",
  FINANCE: "Financeiro",
  SALES: "Vendas",
};

// Rotas que cada cargo pode acessar. Só o Dono (ADMIN) vê tudo;
// o Gerente vê tudo, exceto a gestão de funcionários (/usuarios).
const roleRoutes: Record<UserRole, string[] | "all"> = {
  ADMIN: "all",
  MANAGER: [
    "/",
    "/clientes",
    "/produtos",
    "/pedidos",
    "/producao",
    "/estoque",
    "/financeiro",
    "/relatorios",
    "/terceirizadas",
    "/solicitacoes",
    "/bancada",
    "/configuracoes",
    // O Gerente exclui material e terceirizada, então precisa poder desfazer.
    // Apagar de vez continua só do Dono, dentro da própria tela.
    "/lixeira",
    "/avisos",
  ],
  PRODUCTION: ["/", "/pedidos", "/producao", "/estoque", "/bancada", "/avisos"],
  FINANCE: ["/", "/clientes", "/pedidos", "/financeiro", "/relatorios", "/avisos"],
  SALES: ["/", "/clientes", "/produtos", "/pedidos", "/solicitacoes", "/avisos"],
};

export function canAccessRoute(role: UserRole, href: string) {
  const allowed = roleRoutes[role];
  if (allowed === "all") return true;
  return allowed.includes(href);
}

// ---------- Capacidades por cargo ----------
// Produção é SOMENTE LEITURA nas telas de gestão (acompanha o andamento) e não vê
// valores financeiros. O trabalho interativo dele acontece na Bancada.

export function canSeeFinance(role: UserRole) {
  return role !== "PRODUCTION";
}

// Criar/editar/excluir pedidos e anexos.
export function canManageOrders(role: UserRole) {
  return role !== "PRODUCTION";
}

// Cadastrar material, lançar movimentação, editar/excluir estoque e ficha técnica.
export function canManageStock(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER";
}

// Mover etapas e definir responsável/terceirizada no quadro de produção.
export function canManageProduction(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER";
}

// Histórico de produção por mesa e por funcionário: é controle de gestão,
// então o próprio chão de fábrica não enxerga o desempenho dos colegas.
export function canSeeBancadaHistory(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER";
}

// Na bancada, quem coordena precisa ver o que está em cada mesa. Quem está
// produzindo precisa é da própria peça: para ele o trabalho dos colegas vira
// uma lista curta de acompanhamento, e o destaque fica no que é dele.
export function seesAllBancadaWork(role: UserRole) {
  return role !== "PRODUCTION";
}
