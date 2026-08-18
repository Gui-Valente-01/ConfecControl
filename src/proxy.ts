import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "confec_session";

// Redireciona para /login quem não tem cookie de sessao.
// A verificacao real da assinatura acontece no servidor (getSessionUser).
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // A raiz é pública (landing). O /portal tem autenticação própria (sessão do cliente).
  if (pathname === "/" || pathname === "/portal" || pathname.startsWith("/portal/")) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // O /monitoring e o tunel do Sentry (tunnelRoute no next.config.ts): o
  // navegador faz POST nele para relatar erro. Ele casava o matcher, entao
  // visitante SEM cookie -- landing, login, planos, paginas por segmento --
  // tinha o relato redirecionado 307 para /login. O canal que avisaria de erro
  // em usuario deslogado estava morto, e em silencio.
  //
  // Protege tudo, exceto /login, /cadastro, /planos, /portal, /manual, assets do
  // Next e arquivos estaticos. O /manual fica aberto de proposito: e o material
  // que a pessoa consulta justamente quando ainda nao consegue entrar no
  // sistema. O /planos é a página de vendas: mandá-la para o login escondia o
  // produto de quem ainda não é cliente, que é justamente quem ela existe para
  // atender.
  matcher: ["/((?!login|cadastro|planos|para/|portal|manual|monitoring|privacidade|termos|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
