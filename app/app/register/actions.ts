'use server'

import { redirect } from 'next/navigation'

export type RegisterState = { error: string } | null

/**
 * Server Action — cria conta via Auth0 Database Connection.
 *
 * Pré-requisito Auth0:
 *   Authentication → Database → Username-Password-Authentication → habilitado na sua Application.
 */
export async function signUp(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name    = (formData.get('name')            as string | null)?.trim() ?? ''
  const email   = (formData.get('email')           as string | null)?.trim() ?? ''
  const pw      = (formData.get('password')        as string | null) ?? ''
  const confirm = (formData.get('confirmPassword') as string | null) ?? ''

  if (!name || !email || !pw || !confirm) {
    return { error: 'Preencha todos os campos.' }
  }

  if (pw !== confirm) {
    return { error: 'As senhas não coincidem.' }
  }

  if (pw.length < 8) {
    return { error: 'A senha deve ter no mínimo 8 caracteres.' }
  }

  try {
    const res = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/dbconnections/signup`,
      {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({
          client_id  : process.env.AUTH0_CLIENT_ID,
          email,
          password   : pw,
          name,
          connection : 'Username-Password-Authentication',
        }),
      },
    )

    if (!res.ok) {
      const err = await res.json()
      const desc: string = err.description ?? err.message ?? err.error ?? ''

      if (
        desc.toLowerCase().includes('already in use') ||
        desc.toLowerCase().includes('already exists') ||
        desc.toLowerCase().includes('user already')
      ) {
        return { error: 'Este e-mail já está cadastrado.' }
      }
      if (desc.toLowerCase().includes('password')) {
        return { error: 'Senha fraca. Use letras, números e no mínimo 8 caracteres.' }
      }

      return { error: desc || 'Erro ao criar conta. Tente novamente.' }
    }
  } catch {
    return { error: 'Não foi possível criar a conta. Tente novamente.' }
  }

  redirect('/login?registered=1')
}
