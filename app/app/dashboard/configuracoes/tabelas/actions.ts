'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { TabelaRagDTO, TabelaRagRequest, PagedResponse } from '@/lib/types'

async function getSub(): Promise<string> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session.sub
}

const REVALIDATE = '/dashboard/configuracoes/tabelas'

export async function listarTabelas(
  pagina = 0,
  tamanhoPagina = 20,
  filtroNome?: string,
): Promise<PagedResponse<TabelaRagDTO>> {
  const sub = await getSub()
  let url = `/rag/tabelas?pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`
  if (filtroNome?.trim()) url += `&nome=${encodeURIComponent(filtroNome.trim())}`
  const res = await api.get<PagedResponse<TabelaRagDTO>>(url, { auth0Sub: sub })
  return res.dados ?? { dados: [], pagina: 0, tamanhoPagina: 20, total: 0 }
}

export async function salvarTabela(req: TabelaRagRequest): Promise<TabelaRagDTO> {
  const sub = await getSub()
  const res = await api.post<TabelaRagDTO>('/rag/tabelas', req, { auth0Sub: sub })
  revalidatePath(REVALIDATE)
  return res.dados!
}

export async function deletarTabela(id: string): Promise<void> {
  const sub = await getSub()
  await api.delete(`/rag/tabelas/${id}`, { auth0Sub: sub })
  revalidatePath(REVALIDATE)
}

export async function indexarTabela(nome: string): Promise<void> {
  const sub = await getSub()
  await api.post(`/rag/indexacao/${encodeURIComponent(nome)}`, {}, { auth0Sub: sub })
  revalidatePath(REVALIDATE)
}

export async function indexarTudo(): Promise<{ documentos_indexados: number }> {
  const sub = await getSub()
  const res = await api.post<{ documentos_indexados: number }>(
    '/rag/indexacao',
    {},
    { auth0Sub: sub },
  )
  revalidatePath(REVALIDATE)
  return res.dados ?? { documentos_indexados: 0 }
}
