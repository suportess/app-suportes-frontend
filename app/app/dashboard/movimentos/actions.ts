'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type {
  EmpresaDTO,
  UsuarioDTO,
  PagedResponse,
  MultiEmpresaPortalDTO,
  EstoquePortalDTO,
  ProdutoConsignadoPortalDTO,
  ProdutoDetalhePortalDTO,
  SaldoLotePortalDTO,
  EntradaProdutoPortalDTO,
  TransferenciaConsignadoDTO,
  TransferenciaConsignadoRequest,
} from '@/lib/types'

async function getSub(): Promise<string> {
  const s = await getSession()
  if (!s) redirect('/login')
  return s.sub
}

// ─── Empresa ativa ────────────────────────────────────────────────────────────

/**
 * Retorna a empresa ativa do usuário (cd_empresa_ativa).
 * Se não tiver empresa ativa ou ela não tiver portal configurado, retorna null.
 */
export async function getEmpresaAtiva(): Promise<EmpresaDTO | null> {
  const sub = await getSub()
  const res = await api.get<UsuarioDTO>('/usuarios/me', { auth0Sub: sub })
  const empresaAtiva = res.dados?.empresaAtiva ?? null
  if (!empresaAtiva?.dsHostPortal) return null
  return empresaAtiva
}

/** @deprecated Use getEmpresaAtiva() */
export async function listarEmpresasComPortal(): Promise<EmpresaDTO[]> {
  const sub = await getSub()
  const res = await api.get<EmpresaDTO[]>('/configuracoes/empresa', { auth0Sub: sub })
  return (res.dados ?? []).filter(e => e.dsHostPortal)
}

// ─── Multi-empresas ───────────────────────────────────────────────────────────

/**
 * Lista todas as multi-empresas disponíveis no portal.
 * O backend usa o dsHostPortal e apikey da conf_empresa identificada por empresaId.
 */
export async function listarMultiEmpresas(
  empresaId: number,
): Promise<MultiEmpresaPortalDTO[]> {
  const sub = await getSub()
  const res = await api.get<MultiEmpresaPortalDTO[]>(
    `/portal/mv/empresas/${empresaId}/multiempresas`,
    { auth0Sub: sub },
  )
  return res.dados ?? []
}

// ─── Estoques ─────────────────────────────────────────────────────────────────

export async function listarEstoques(
  empresaId: number,
  cdMultiEmpresa: number,
  page: number,
  pageSize: number,
): Promise<PagedResponse<EstoquePortalDTO>> {
  const sub = await getSub()
  const res = await api.get<PagedResponse<EstoquePortalDTO>>(
    `/portal/mv/empresas/${empresaId}/multiempresas/${cdMultiEmpresa}/estoques?page=${page}&pageSize=${pageSize}`,
    { auth0Sub: sub },
  )
  return res.dados ?? { dados: [], pagina: page, tamanhoPagina: pageSize }
}

// ─── Produtos consignados ─────────────────────────────────────────────────────

export async function listarProdutosConsignados(
  empresaId: number,
  cdMultiEmpresa: number,
  cdEstoque: number,
  page: number,
  pageSize: number,
): Promise<PagedResponse<ProdutoConsignadoPortalDTO>> {
  const sub = await getSub()
  const res = await api.get<PagedResponse<ProdutoConsignadoPortalDTO>>(
    `/portal/mv/empresas/${empresaId}/multiempresas/${cdMultiEmpresa}/estoques/${cdEstoque}/produtos?page=${page}&pageSize=${pageSize}`,
    { auth0Sub: sub },
  )
  return res.dados ?? { dados: [], pagina: page, tamanhoPagina: pageSize }
}

// ─── Entradas por produto ───────────────────────────────────────────────────

export async function listarEntradas(
  empresaId: number,
  cdEstoque: number,
  cdProduto: number,
  page: number,
  pageSize: number,
): Promise<PagedResponse<EntradaProdutoPortalDTO>> {
  const sub = await getSub()
  const res = await api.get<PagedResponse<EntradaProdutoPortalDTO>>(
    `/portal/mv/empresas/${empresaId}/estoques/${cdEstoque}/produtos/${cdProduto}/entradas?page=${page}&pageSize=${pageSize}`,
    { auth0Sub: sub },
  )
  return res.dados ?? { dados: [], pagina: page, tamanhoPagina: pageSize }
}

// ─── Saldo em lote ────────────────────────────────────────────────────────────

export async function buscarSaldoLote(
  empresaId: number,
  cdEstoque: number,
  cdProduto: number,
): Promise<SaldoLotePortalDTO | null> {
  const sub = await getSub()
  const res = await api.get<SaldoLotePortalDTO>(
    `/portal/mv/empresas/${empresaId}/estoques/${cdEstoque}/produtos/${cdProduto}/saldo-lote`,
    { auth0Sub: sub },
  )
  return res.dados ?? null
}

// ─── Detalhe do produto ────────────────────────────────────────────────────────

export async function buscarProdutoDetalhe(
  empresaId: number,
  cdProduto: number,
): Promise<ProdutoDetalhePortalDTO | null> {
  const sub = await getSub()
  const res = await api.get<ProdutoDetalhePortalDTO>(
    `/portal/mv/empresas/${empresaId}/produtos/${cdProduto}`,
    { auth0Sub: sub },
  )
  return res.dados ?? null
}

// ─── Transferências consignadas ────────────────────────────────────────────────

export async function salvarTransferencia(
  empresaId: number,
  req: TransferenciaConsignadoRequest,
): Promise<TransferenciaConsignadoDTO> {
  const sub = await getSub()
  const res = await api.post<TransferenciaConsignadoDTO>(
    `/empresas/${empresaId}/transferencias-consignado`,
    req,
    { auth0Sub: sub },
  )
  if (!res.sucesso || !res.dados) throw new Error(res.mensagem ?? 'Erro ao salvar transferência.')
  return res.dados
}

export async function listarTransferencias(
  empresaId: number,
  page = 1,
  pageSize = 20,
): Promise<PagedResponse<TransferenciaConsignadoDTO>> {
  const sub = await getSub()
  const res = await api.get<PagedResponse<TransferenciaConsignadoDTO>>(
    `/empresas/${empresaId}/transferencias-consignado?page=${page}&pageSize=${pageSize}`,
    { auth0Sub: sub },
  )
  return res.dados ?? { dados: [], pagina: page, tamanhoPagina: pageSize, total: 0 }
}

export async function concluirTransferencia(
  empresaId: number,
  id: number,
): Promise<TransferenciaConsignadoDTO> {
  const sub = await getSub()
  const res = await api.post<TransferenciaConsignadoDTO>(
    `/empresas/${empresaId}/transferencias-consignado/${id}/concluir`,
    {},
    { auth0Sub: sub },
  )
  if (!res.sucesso || !res.dados) throw new Error(res.mensagem ?? 'Erro ao concluir transferência.')
  return res.dados
}
