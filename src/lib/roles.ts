import type { UserRole } from "@prisma/client";

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Dono",
  MANAGER: "Gerente",
  PRODUCTION: "Produção",
  FINANCE: "Financeiro",
  SALES: "Vendas",
};

// Rotas que cada cargo pode acessar. ADMIN e MANAGER veem tudo.
const roleRoutes: Record<UserRole, string[] | "all"> = {
  ADMIN: "all",
  MANAGER: "all",
  PRODUCTION: ["/", "/pedidos", "/producao", "/estoque"],
  FINANCE: ["/", "/clientes", "/pedidos", "/financeiro", "/relatorios"],
  SALES: ["/", "/clientes", "/produtos", "/pedidos"],
};

export function canAccessRoute(role: UserRole, href: string) {
  const allowed = roleRoutes[role];
  if (allowed === "all") return true;
  return allowed.includes(href);
}
