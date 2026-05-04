'use server'

import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { UsuarioDTO } from '@/lib/types'
import { revalidatePath } from 'next/cache'

/**
 * Define a empresa ativa do usuário autenticado.
 * Persiste no backend e invalida o cache do layout.
 */
export async function atualizarEmpresaAtiva(empresaId: number): Promise<void> {
  const session = await getSession()
  if (!session) throw new Error('Não autenticado.')
  await api.put<UsuarioDTO>(`/usuarios/me/empresa-ativa/${empresaId}`, {}, {
    auth0Sub: session.sub,
  })
  revalidatePath('/dashboard', 'layout')
}
