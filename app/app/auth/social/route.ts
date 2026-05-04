import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /auth/social?connection=<provider>
 *
 * Inicia o fluxo OAuth2 Authorization Code para login social.
 * Providers suportados no Auth0:
 *   Google    → google-oauth2
 *   Microsoft → windowslive
 *   GitHub    → github
 *   Apple     → apple
 *
 * O Auth0 gerencia a validação de state (CSRF) internamente.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const connection = searchParams.get('connection')

  if (!connection) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const baseUrl = process.env.AUTH0_BASE_URL ?? 'http://localhost:3001'
  const issuer  = process.env.AUTH0_ISSUER_BASE_URL!

  const params = new URLSearchParams({
    response_type : 'code',
    client_id     : process.env.AUTH0_CLIENT_ID!,
    redirect_uri  : `${baseUrl}/auth/social-callback`,
    scope         : 'openid profile email',
    connection,
  })

  return NextResponse.redirect(`${issuer}/authorize?${params.toString()}`)
}
