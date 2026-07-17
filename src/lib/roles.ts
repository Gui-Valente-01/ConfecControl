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
    "/configuracoes",
  ],
  PRODUCTION: ["/", "/pedidos", "/producao", "/estoque"],
  FINANCE: ["/", "/clientes", "/pedidos", "/financeiro", "/relatorios"],
  SALES: ["/", "/clientes", "/produtos", "/pedidos", "/solicitacoes"],
};

export function canAccessRoute(role: UserRole, href: string) {
  const allowed = roleRoutes[role];
  if (allowed === "all") return true;
  return allowed.includes(href);
}
