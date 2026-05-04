'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { BancoDadosDTO, BancoDadosRequest, PortalStatusDTO } from '@/lib/types'

async function getSub(): Promise<string> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session.sub
}

/** Verifica o status do portal ngrok da empresa ativa. */
export async function buscarStatusPortal(): Promise<PortalStatusDTO | null> {
  const sub = await getSub()
  const res = await api.get<PortalStatusDTO>('/configuracoes/banco/status', { auth0Sub: sub })
  return res.dados ?? null
}

export async function buscarBancoDados(): Promise<BancoDadosDTO | null> {
  const sub = await getSub()
  const res = await api.get<BancoDadosDTO>('/configuracoes/banco', { auth0Sub: sub })
  return res.dados ?? null
}

export async function salvarBancoDados(req: BancoDadosRequest): Promise<BancoDadosDTO> {
  const sub = await getSub()
  const res = await api.post<BancoDadosDTO>('/configuracoes/banco', req, { auth0Sub: sub })
  revalidatePath('/dashboard/configuracoes/banco')
  return res.dados!
}

export async function removerBancoDados(): Promise<void> {
  const sub = await getSub()
  await api.delete('/configuracoes/banco', { auth0Sub: sub })
  revalidatePath('/dashboard/configuracoes/banco')
}
