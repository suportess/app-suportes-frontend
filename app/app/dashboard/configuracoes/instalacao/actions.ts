'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { EmpresaDTO, UsuarioDTO } from '@/lib/types'

async function getSub(): Promise<string> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session.sub
}

/** Retorna a empresa ativa do usuário, ou null se não houver. */
export async function getEmpresaAtiva(): Promise<EmpresaDTO | null> {
  const sub = await getSub()
  const res = await api.get<UsuarioDTO>('/usuarios/me', { auth0Sub: sub })
  return res.dados?.empresaAtiva ?? null
}

/**
 * Gera o conteúdo do docker-compose.yml pré-preenchido com os dados da empresa ativa.
 * Retorna a string YAML para download no cliente.
 */
export async function gerarDockerCompose(): Promise<string> {
  const sub = await getSub()
  const res = await api.get<string>('/configuracoes/instalacao/docker-compose', { auth0Sub: sub })
  if (!res.dados) throw new Error('Falha ao gerar docker-compose.')
  return res.dados
}
