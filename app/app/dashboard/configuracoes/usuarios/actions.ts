'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { UsuarioDTO, EmpresaDTO } from '@/lib/types'

async function getSub(): Promise<string> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session.sub
}

export async function listarUsuarios(): Promise<UsuarioDTO[]> {
  const sub = await getSub()
  const res = await api.get<UsuarioDTO[]>('/usuarios', { auth0Sub: sub })
  return res.dados ?? []
}

export async function buscarUsuario(id: number): Promise<UsuarioDTO> {
  const sub = await getSub()
  const res = await api.get<UsuarioDTO>(`/usuarios/${id}`, { auth0Sub: sub })
  return res.dados!
}

export async function vincularEmpresa(usuarioId: number, empresaId: number): Promise<UsuarioDTO> {
  const sub = await getSub()
  const res = await api.post<UsuarioDTO>(
    `/usuarios/${usuarioId}/empresas/${empresaId}`,
    {},
    { auth0Sub: sub },
  )
  return res.dados!
}

export async function desvincularEmpresa(usuarioId: number, empresaId: number): Promise<void> {
  const sub = await getSub()
  await api.delete(`/usuarios/${usuarioId}/empresas/${empresaId}`, { auth0Sub: sub })
}

export async function listarEmpresasDisponiveis(): Promise<EmpresaDTO[]> {
  const sub = await getSub()
  const res = await api.get<EmpresaDTO[]>('/configuracoes/empresa', { auth0Sub: sub })
  return res.dados ?? []
}
