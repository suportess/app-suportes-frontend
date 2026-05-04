import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let email: string, password: string

  try {
    const body = await request.json()
    email    = (body.email    as string | undefined)?.trim() ?? ''
    password = (body.password as string | undefined)          ?? ''
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Preencha e-mail e senha.' }, { status: 400 })
  }

  const issuer = process.env.AUTH0_ISSUER_BASE_URL!

  let sessionToken: string
  let expiresIn:     number

  try {
    const res = await fetch(`${issuer}/oauth/token`, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({
        grant_type    : 'http://auth0.com/oauth/grant-type/password-realm',
        realm         : 'Username-Password-Authentication',
        username      : email,
        password,
        client_id     : process.env.AUTH0_CLIENT_ID,
        client_secret : process.env.AUTH0_CLIENT_SECRET,
        scope         : 'openid profile email',
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, string>
      const msg = err.error_description ?? err.message ?? 'E-mail ou senha incorretos.'
      return NextResponse.json({ error: msg }, { status: 401 })
    }

    const data   = await res.json()
    // id_token é sempre um JWT com sub/email/name/picture.
    // access_token sem audience é opaco (não-JWT) e não pode ser decodificado.
    sessionToken = (data.id_token ?? data.access_token) as string
    expiresIn    = (data.expires_in as number) ?? 86400
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conectar ao servidor de autenticação.' },
      { status: 502 },
    )
  }

  const isSecure = process.env.NODE_ENV === 'production'
  const cookieStr = [
    `portal_session=${sessionToken}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${expiresIn}`,
    isSecure ? 'Secure' : '',
  ].filter(Boolean).join('; ')

  console.log('[login] setting cookie, token length:', sessionToken.length, '| cookie header length:', cookieStr.length)

  return new Response(JSON.stringify({ success: true }), {
    status  : 200,
    headers : {
      'Content-Type' : 'application/json',
      'Set-Cookie'   : cookieStr,
    },
  })
}
