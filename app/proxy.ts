import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (antes: middleware) — proteção de rotas.
 * Verifica o cookie `portal_session`; caso ausente redireciona para /login.
 */
export default function proxy(request: NextRequest) {
  // Next.js 16 / Turbopack tem bug onde request.cookies.get().value
  // pode retornar vazio mesmo com o cookie presente.
  // Lemos o header Cookie diretamente como fallback confiável.
  const rawCookie = request.headers.get('cookie') ?? ''
  const sessionValue = rawCookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('portal_session='))
    ?.split('=')
    .slice(1)
    .join('=') // preserva '=' dentro do valor JWT

  console.log('[proxy]', request.nextUrl.pathname, '| has_session:', !!sessionValue, '| len:', sessionValue?.length ?? 0)

  if (!sessionValue) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protege todas as rotas EXCETO:
     * – arquivos estáticos (_next/static, _next/image, favicon, etc.)
     * – rotas públicas de autenticação (/auth/*)
     * – página de login (/login)
     * – página de cadastro (/register)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|auth|login|register).*)",
  ],
};
