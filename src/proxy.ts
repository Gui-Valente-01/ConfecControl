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
  // Protege tudo, exceto /login, /cadastro, /portal, assets do Next e arquivos estaticos.
  matcher: ["/((?!login|cadastro|portal|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
