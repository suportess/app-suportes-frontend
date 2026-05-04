import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /auth/social-callback
 *
 * Recebe o código de autorização do Auth0 após login social,
 * troca pelo access_token e define o cookie de sessão.
 *
 * Estratégia: retornar uma página HTML que define o cookie via Set-Cookie header
 * e redireciona via JS — mais confiável do que NextResponse.redirect() + cookie
 * em Next.js 16 (evita race condition entre Set-Cookie e o redirect).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code      = searchParams.get('code')
  const error     = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  const baseUrl  = process.env.AUTH0_BASE_URL ?? 'http://localhost:3001'
  const issuer   = process.env.AUTH0_ISSUER_BASE_URL!
  const loginUrl = `${baseUrl}/login`

  // ── Auth0 retornou erro ──
  if (error) {
    const msg = encodeURIComponent(errorDesc ?? 'Autenticação cancelada.')
    return NextResponse.redirect(`${loginUrl}?error=${msg}`)
  }

  if (!code) {
    return NextResponse.redirect(loginUrl)
  }

  // ── Troca código por access_token ──
  let accessToken: string
  let expiresIn: number

  try {
    const tokenRes = await fetch(`${issuer}/oauth/token`, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({
        grant_type    : 'authorization_code',
        client_id     : process.env.AUTH0_CLIENT_ID,
        client_secret : process.env.AUTH0_CLIENT_SECRET,
        redirect_uri  : `${baseUrl}/auth/social-callback`,
        code,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({})) as Record<string, string>
      const msg = encodeURIComponent(
        err.error_description ?? err.message ?? 'Falha na autenticação. Tente novamente.',
      )
      return NextResponse.redirect(`${loginUrl}?error=${msg}`)
    }

    const tokens = await tokenRes.json()
    // id_token é sempre um JWT com sub/email/name/picture.
    // access_token sem audience é opaco (não-JWT).
    accessToken  = (tokens.id_token ?? tokens.access_token) as string
    expiresIn    = (tokens.expires_in as number) ?? 86400

  } catch {
    return NextResponse.redirect(`${loginUrl}?error=Erro+inesperado.+Tente+novamente.`)
  }

  // ── Retorna HTML que navega para /dashboard após o cookie ser definido ──
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=/dashboard">
  <title>Autenticando...</title>
  <style>
    body{margin:0;display:flex;align-items:center;justify-content:center;
    min-height:100vh;background:#060E1A;font-family:sans-serif;color:#90A4AE;font-size:.875rem}
  </style>
</head>
<body>
  <p>Redirecionando para o painel&hellip;</p>
  <script>window.location.replace('/dashboard')</script>
</body>
</html>`

  const response = new NextResponse(html, {
    status  : 200,
    headers : { 'Content-Type': 'text/html; charset=utf-8' },
  })
  response.cookies.set('portal_session', accessToken, {
    httpOnly : true,
    secure   : process.env.NODE_ENV === 'production',
    sameSite : 'lax',
    maxAge   : expiresIn,
    path     : '/',
  })
  return response
}
