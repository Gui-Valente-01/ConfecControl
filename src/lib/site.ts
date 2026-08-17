// Endereço público do site e quais páginas o Google pode ver.
//
// Existe porque sitemap, robots e as tags de compartilhamento precisam do
// endereço ABSOLUTO, e cada um inventando o seu levava a link quebrado no
// WhatsApp e a página fora do índice. Aqui é um lugar só.

// O endereço de verdade do site, com "www" porque é para lá que o domínio sem
// www redireciona — apontar para o outro faria cada link do sitemap custar um
// desvio a mais, e o Google trata endereço que redireciona como endereço de
// segunda.
//
// O padrão já é o domínio final, e não o da Vercel, para o site não depender de
// alguém lembrar de cadastrar a variável: sem endereço certo aqui, o Next monta
// as tags com "localhost" ou com o endereço de teste, e foi assim que o site
// ficou fora da busca até pelo próprio nome.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.confeccontrol.com").replace(/\/$/, "");

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
