'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type {
  EspecieMvDTO,
  ClasseMvDTO,
  SubClasseMvDTO,
  UnidadeMvDTO,
  ProdutoMvDTO,
  PagedResponse,
} from '@/lib/types'

async function getSub(): Promise<string> {
  const s = await getSession()
  if (!s) redirect('/login')
  return s.sub
}

// ─── Unidade ────────────────────────────────────────────────────────────────────────────────

export async function listarUnidades(): Promise<UnidadeMvDTO[]> {
  const sub = await getSub()
  const res = await api.get<UnidadeMvDTO[]>('/produtos/unidades', { auth0Sub: sub })
  return res.dados ?? []
}

// ─── Espécie ───────────────────────────────────────────────────────────────────────────────────

export async function listarEspecies(): Promise<EspecieMvDTO[]> {
  const sub = await getSub()
  const res = await api.get<EspecieMvDTO[]>('/produtos/especies', { auth0Sub: sub })
  return res.dados ?? []
}

// ─── Classe (filtrada por espécie) ───────────────────────────────────────────

export async function listarClasses(cdEspecie: number): Promise<ClasseMvDTO[]> {
  const sub = await getSub()
  const res = await api.get<ClasseMvDTO[]>(
    `/produtos/classes?cdEspecie=${cdEspecie}`,
    { auth0Sub: sub },
  )
  return res.dados ?? []
}

// ─── Subclasse (filtrada por espécie + classe) ───────────────────────────────

export async function listarSubClasses(
  cdEspecie: number,
  cdClasse: number,
): Promise<SubClasseMvDTO[]> {
  const sub = await getSub()
  const res = await api.get<SubClasseMvDTO[]>(
    `/produtos/sub-classes?cdEspecie=${cdEspecie}&cdClasse=${cdClasse}`,
    { auth0Sub: sub },
  )
  return res.dados ?? []
}

// ─── Produtos (todos para transfer list, paginação grande) ───────────────────

export async function listarTodosProdutos(
  page = 1,
  pageSize = 500,
): Promise<PagedResponse<ProdutoMvDTO>> {
  const sub = await getSub()
  const res = await api.get<PagedResponse<ProdutoMvDTO>>(
    `/produtos?busca=&page=${page}&pageSize=${pageSize}`,
    { auth0Sub: sub },
  )
  return res.dados ?? { dados: [], pagina: page, tamanhoPagina: pageSize, total: 0 }
}

// ─── Vincular classificação a um produto ─────────────────────────────────────

export async function vincularClassificacao(
  cdProduto: string,
  cdEspecie: number,
  cdClasse: number,
  cdSubCla: number,
): Promise<void> {
  const sub = await getSub()
  await api.put(`/produtos/${cdProduto}/classificacao`, {
    cdEspecie,
    cdClasse,
    cdSubCla,
  }, { auth0Sub: sub })
}
