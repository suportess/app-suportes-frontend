import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { UsuarioDTO } from '@/lib/types'
import { listarUsuarios } from './actions'
import { UsuariosView } from './_components/usuarios-view'

export default async function UsuariosPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Busca o perfil do usuário autenticado para checar o tipo
  let meUsuario: UsuarioDTO | null = null
  try {
    const res = await api.get<UsuarioDTO>('/usuarios/me', { auth0Sub: session.sub })
    meUsuario = res.dados
  } catch {
    // ignora — a restrição principal está no backend
  }

  if (meUsuario?.tipo === 'OPERADOR') {
    redirect('/dashboard/configuracoes/empresa')
  }

  const usuarios = await listarUsuarios().catch(() => [])
  return <UsuariosView usuariosIniciais={usuarios} />
}
