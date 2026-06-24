import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "confec_session";

// Redireciona para /login quem não tem cookie de sessao.
// A verificacao real da assinatura acontece no servidor (getSessionUser).
export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protege tudo, exceto /login, /cadastro, assets do Next e arquivos estaticos.
  matcher: ["/((?!login|cadastro|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
