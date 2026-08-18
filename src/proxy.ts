import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "confec_session";

/**
 * Manda para o login quem tenta abrir uma tela interna sem sessão.
 *
 * A verificação real da assinatura acontece no servidor, em getSessionUser:
 * aqui só olhamos se o cookie existe, porque isto roda em toda requisição e
 * não deve conversar com o banco.
 */
export function proxy(req: NextRequest) {
  const temSessao = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (temSessao) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

/** As telas internas protegidas. Exportada para o teste conferir a lista. */
export const ROTAS_INTERNAS = [
  "/avisos",
  "/bancada",
  "/busca",
  "/clientes",
  "/configuracoes",
  "/conta",
  "/estoque",
  "/financeiro",
  "/fiscal",
  "/lixeira",
  "/master",
  "/pedidos",
  "/producao",
  "/produtos",
  "/relatorios",
  "/solicitacoes",
  "/terceirizadas",
  "/usuarios",
] as const;

export const config = {
  /**
   * Roda SOMENTE nas telas internas que existem.
   *
   * Antes era o contrário: protegia tudo, menos uma lista de exceções. O efeito
   * colateral era que endereço inexistente também caía no login — quem digitava
   * errado recebia uma tela de "entrar", como se tivesse sido desconectado, e o
   * Google via um erro se passando por página válida. Com a lista invertida, o
   * que não está aqui segue para o Next, que responde 404 de verdade.
   *
   * Esquecer uma rota interna aqui NÃO abre brecha: toda página chama
   * requireRouteUser (ou requireUser) e manda o visitante para o login por
   * conta própria. Isto evita a viagem até o servidor de página; a autorização
   * de verdade mora lá. O teste em tests/proxy-matcher.test.ts cobra que esta
   * lista acompanhe as rotas protegidas.
   *
   * A lista precisa ser literal: o Next lê o matcher no build, e nao consegue
   * enxergar um valor montado a partir de outro arquivo.
   *
   * Ficam de fora de propósito:
   *   /            landing pública
   *   /portal      tem sessão própria, do cliente da confecção
   *   /api         responde JSON; mandar para uma página HTML de login
   *                quebraria quem consome
   *   /monitoring  túnel do Sentry, que precisa receber POST de quem não está
   *                logado — foi assim que o aviso de erro morreu antes
   */
  matcher: [
    "/avisos/:path*",
    "/bancada/:path*",
    "/busca/:path*",
    "/clientes/:path*",
    "/configuracoes/:path*",
    "/conta/:path*",
    "/estoque/:path*",
    "/financeiro/:path*",
    "/fiscal/:path*",
    "/lixeira/:path*",
    "/master/:path*",
    "/pedidos/:path*",
    "/producao/:path*",
    "/produtos/:path*",
    "/relatorios/:path*",
    "/solicitacoes/:path*",
    "/terceirizadas/:path*",
    "/usuarios/:path*",
  ],
};
