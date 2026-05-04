import { cookies } from 'next/headers'

export type SessionUser = {
  sub     : string
  email?  : string
  name?   : string
  picture?: string
  exp?    : number
}

/** Lê o token da sessão e decodifica o payload JWT (sem verificar assinatura). */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('portal_session')
  if (!token?.value) return null

  try {
    const [, b64] = token.value.split('.')
    const decoded = JSON.parse(
      Buffer.from(b64, 'base64url').toString('utf-8'),
    ) as SessionUser

    // Verifica expiração
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return decoded
  } catch {
    return null
  }
}

/** Remove o cookie de sessão. */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('portal_session')
}
