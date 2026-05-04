'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { EmpresaDTO, EmpresaRequest, GerarNgrokResponse } from '@/lib/types'

async function getSub(): Promise<string> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session.sub
}

export async function listarEmpresas(): Promise<EmpresaDTO[]> {
  const sub = await getSub()
  const res = await api.get<EmpresaDTO[]>('/configuracoes/empresa', { auth0Sub: sub })
  return res.dados ?? []
}

export async function cadastrarEmpresa(req: EmpresaRequest): Promise<EmpresaDTO> {
  const sub = await getSub()
  const res = await api.post<EmpresaDTO>('/configuracoes/empresa', req, { auth0Sub: sub })
  revalidatePath('/dashboard/configuracoes/empresa')
  return res.dados!
}

export async function atualizarEmpresa(id: number, req: EmpresaRequest): Promise<EmpresaDTO> {
  const sub = await getSub()
  const res = await api.put<EmpresaDTO>(`/configuracoes/empresa/${id}`, req, { auth0Sub: sub })
  revalidatePath('/dashboard/configuracoes/empresa')
  return res.dados!
}

export async function regenerarApikey(id: number): Promise<EmpresaDTO> {
  const sub = await getSub()
  const res = await api.post<EmpresaDTO>(
    `/configuracoes/empresa/${id}/regenerar-apikey`,
    {},
    { auth0Sub: sub },
  )
  revalidatePath('/dashboard/configuracoes/empresa')
  return res.dados!
}

export async function deletarEmpresa(id: number): Promise<void> {
  const sub = await getSub()
  await api.delete(`/configuracoes/empresa/${id}`, { auth0Sub: sub })
  revalidatePath('/dashboard/configuracoes/empresa')
}

// ─── Ngrok ────────────────────────────────────────────────────────────────────

/**
 * Gera domínio ngrok e salva em ds_host_portal de forma atômica no backend.
 * Retorna a empresa atualizada + ngrokDomainId (para futura exclusão via API).
 */
export async function gerarNgrokEmpresa(id: number): Promise<GerarNgrokResponse> {
  const sub = await getSub()
  const res = await api.post<GerarNgrokResponse>(
    `/configuracoes/empresa/${id}/gerar-ngrok`,
    {},
    { auth0Sub: sub },
  )
  revalidatePath('/dashboard/configuracoes/empresa')
  return res.dados!
}

/**
 * Remove domínio ngrok (via API ngrok se ngrokId fornecido) e limpa ds_host_portal.
 */
export async function removerNgrokEmpresa(id: number, ngrokId?: string): Promise<EmpresaDTO> {
  const sub = await getSub()
  const query = ngrokId ? `?ngrokId=${encodeURIComponent(ngrokId)}` : ''
  const res = await api.delete<EmpresaDTO>(
    `/configuracoes/empresa/${id}/gerar-ngrok${query}`,
    { auth0Sub: sub },
  )
  revalidatePath('/dashboard/configuracoes/empresa')
  return res.dados!
}
