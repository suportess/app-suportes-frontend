'use server'

import { cookies } from 'next/headers'

export type LoginState = { error: string } | { success: true } | null

/**
 * Server Action - autenticacao via Auth0 Resource Owner Password Grant.
 */
export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email    = (formData.get('email')    as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!email || !password) {
    return { error: 'Preencha e-mail e senha.' }
  }

  let accessToken: string
  let expiresIn: number

  try {
    const res = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type    : 'http://auth0.com/oauth/grant-type/password-realm',
          realm         : 'Username-Password-Authentication',
          username      : email,
          password,
          client_id     : process.env.AUTH0_CLIENT_ID,
          client_secret : process.env.AUTH0_CLIENT_SECRET,
          scope         : 'openid profile email',
        }),
      },
    )

    if (!res.ok) {
      const err = await res.json()
      const msg: string =
        err.error_description ?? err.message ?? 'E-mail ou senha incorretos.'
      return { error: msg }
    }

    const data = await res.json()
    accessToken = data.access_token as string
    expiresIn   = (data.expires_in as number) ?? 86400
  } catch {
    return { error: 'Nao foi possivel conectar ao servidor de autenticacao.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('portal_session', accessToken, {
    httpOnly : true,
    secure   : process.env.NODE_ENV === 'production',
    sameSite : 'lax',
    maxAge   : expiresIn,
    path     : '/',
  })

  return { success: true as const }
}
