// Endereço público do site e quais páginas o Google pode ver.
//
// Existe porque sitemap, robots e as tags de compartilhamento precisam do
// endereço ABSOLUTO, e cada um inventando o seu levava a link quebrado no
// WhatsApp e a página fora do índice. Aqui é um lugar só.

// Em produção vem da variável; sem ela, o endereço atual da Vercel. O fallback
// importa: sem endereço, o Next monta as tags com "localhost", e foi assim que
// o site ficou sem aparecer na busca nem pelo próprio nome.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://confeccontrolapp.vercel.app").replace(/\/$/, "");

/**
 * Páginas que existem para quem ainda não é cliente.
 *
 * É a lista que o sitemap entrega ao Google. Tudo que não está aqui é tela de
 * dentro do sistema: exige login e não deve ser rastreada.
 */
export const rotasPublicas = [
  { caminho: "/", prioridade: 1, frequencia: "weekly" as const },
  { caminho: "/planos", prioridade: 0.8, frequencia: "monthly" as const },
  { caminho: "/login", prioridade: 0.3, frequencia: "yearly" as const },
  { caminho: "/cadastro", prioridade: 0.3, frequencia: "yearly" as const },
];

/**
 * Telas de dentro do sistema, bloqueadas para robô.
 *
 * Todas já exigem login e redirecionam para /login. O bloqueio é para o robô
 * não gastar rastreio nelas e para não indexar a tela de login repetida em
 * dezenas de endereços diferentes.
 */
export const rotasPrivadas = [
  "/api/",
  "/avisos",
  "/bancada",
  "/busca",
  "/clientes",
  "/configuracoes",
  "/conta",
  "/estoque",
  "/financeiro",
  "/lixeira",
  "/master",
  "/pedidos",
  "/portal",
  "/producao",
  "/produtos",
  "/relatorios",
  "/solicitacoes",
  "/terceirizadas",
  "/usuarios",
];

/** Endereço absoluto de uma rota, para sitemap e tags de compartilhamento. */
export function urlAbsoluta(caminho: string): string {
  return `${siteUrl}${caminho === "/" ? "" : caminho}`;
}
