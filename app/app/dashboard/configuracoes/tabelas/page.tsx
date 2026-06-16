import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { UsuarioDTO } from '@/lib/types'
import { listarTabelas } from './actions'
import { TabelasView } from './_components/tabelas-view'

export default async function TabelasPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let meUsuario: UsuarioDTO | null = null
  try {
    const res = await api.get<UsuarioDTO>('/usuarios/me', { auth0Sub: session.sub })
    meUsuario = res.dados
  } catch {}

  if (meUsuario?.tipo === 'OPERADOR') {
    redirect('/dashboard/configuracoes/empresa')
  }

  const paginaInicial = await listarTabelas(0, 20).catch(() => ({
    dados: [], pagina: 0, tamanhoPagina: 20, total: 0,
  }))

  return <TabelasView paginaInicial={paginaInicial} />
}
