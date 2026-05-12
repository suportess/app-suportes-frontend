'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type {
  EmpresaDTO,
  EmpresaProdutoPortalDTO,
  PagedResponse,
  ProdutoMvDTO,
  UniProPortalDTO,
  UsuarioDTO,
} from '@/lib/types'

async function getSub(): Promise<string> {
  const s = await getSession()
  if (!s) redirect('/login')
  return s.sub
}

// ─── Empresa ativa ─────────────────────────────────────────────────────────

export async function getEmpresaAtiva(): Promise<EmpresaDTO | null> {
  const sub = await getSub()
  const res = await api.get<UsuarioDTO>('/usuarios/me', { auth0Sub: sub })
  const empresaAtiva = res.dados?.empresaAtiva ?? null
  if (!empresaAtiva?.dsHostPortal) return null
  return empresaAtiva
}

// ─── Listar produtos ────────────────────────────────────────────────────────

export async function listarProdutos(
  busca: string,
  page: number,
  pageSize: number,
): Promise<PagedResponse<ProdutoMvDTO>> {
  const sub = await getSub()
  const params = new URLSearchParams({
    busca,
    page: String(page),
    pageSize: String(pageSize),
  })
  const res = await api.get<PagedResponse<ProdutoMvDTO>>(
    `/produtos?${params.toString()}`,
    { auth0Sub: sub },
  )
  return res.dados ?? { dados: [], pagina: page, tamanhoPagina: pageSize, total: 0 }
}

// ─── Unidades do produto ────────────────────────────────────────────────────

export async function listarUniPro(cdProduto: string): Promise<UniProPortalDTO[]> {
  const sub = await getSub()
  const res = await api.get<UniProPortalDTO[]>(`/produtos/${cdProduto}/unidades`, { auth0Sub: sub })
  return res.dados ?? []
}

// ─── Empresas do produto ────────────────────────────────────────────────────

export async function listarEmpresaProduto(cdProduto: string): Promise<EmpresaProdutoPortalDTO[]> {
  const sub = await getSub()
  const res = await api.get<EmpresaProdutoPortalDTO[]>(`/produtos/${cdProduto}/empresas`, { auth0Sub: sub })
  return res.dados ?? []
}
