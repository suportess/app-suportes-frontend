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
  SaldoProdutoConsignadoPortalDTO,
  SaldoConsigFornPortalDTO,
  ProdutoDetalhePortalDTO,
  SaldoLotePortalDTO,
  EntradaProdutoPortalDTO,
  TransferenciaConsignadoDTO,
  TransferenciaConsignadoRequest,
  FornecedorPortalDTO,
  OperacaoBaixaConsignadoRequest,
  OperacaoBaixaConsignadoDTO,
  PagedResponse,
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

// ─── Saldo completo de consignados ────────────────────────────────────────────

export async function listarSaldoConsignados(
  empresaId: number,
  cdMultiEmpresa: number,
  cdEstoque: number,
  busca?: string,
): Promise<SaldoProdutoConsignadoPortalDTO[]> {
  const sub = await getSub()
  const query = busca ? `?busca=${encodeURIComponent(busca)}` : ''
  const res = await api.get<SaldoProdutoConsignadoPortalDTO[]>(
    `/portal/mv/empresas/${empresaId}/multiempresas/${cdMultiEmpresa}/estoques/${cdEstoque}/saldo-consignados${query}`,
    { auth0Sub: sub },
  )
  return res.dados ?? []
}
// ─── Saldo consignado por fornecedor ──────────────────────────────────────────────────

export async function listarSaldoConsigForn(
  empresaId: number,
  cdEstoque: number,
  cdProduto: number,
): Promise<SaldoConsigFornPortalDTO[]> {
  const sub = await getSub()
  const res = await api.get<SaldoConsigFornPortalDTO[]>(
    `/portal/mv/empresas/${empresaId}/estoques/${cdEstoque}/produtos/${cdProduto}/saldo-consig-forn`,
    { auth0Sub: sub },
  )
  return res.dados ?? []
}
// ─── Estoques todos consignados ────────────────────────────────────────────────

export async function listarEstoquesTodosConsignados(
  empresaId: number,
  cdMultiEmpresa: number,
  busca?: string,
): Promise<EstoquePortalDTO[]> {
  const sub = await getSub()
  const query = busca ? `?busca=${encodeURIComponent(busca)}` : ''
  const res = await api.get<EstoquePortalDTO[]>(
    `/portal/mv/empresas/${empresaId}/multiempresas/${cdMultiEmpresa}/estoques/todos${query}`,
    { auth0Sub: sub },
  )
  return res.dados ?? []
}

// ─── Todos os produtos consignados ──────────────────────────────────────────────

export async function listarTodosProdutosConsignados(
  empresaId: number,
): Promise<ProdutoConsignadoPortalDTO[]> {
  const sub = await getSub()
  const res = await api.get<ProdutoConsignadoPortalDTO[]>(
    `/portal/mv/empresas/${empresaId}/produtos-consignados`,
    { auth0Sub: sub },
  )
  return res.dados ?? []
}

// ─── Fornecedores ──────────────────────────────────────────────────

export async function listarFornecedores(
  empresaId: number,
): Promise<FornecedorPortalDTO[]> {
  const sub = await getSub()
  const res = await api.get<FornecedorPortalDTO[]>(
    `/portal/mv/empresas/${empresaId}/fornecedores`,
    { auth0Sub: sub },
  )
  return res.dados ?? []
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


// ─── Operação Baixa Consignado ────────────────────────────────────────────────

export async function salvarOperacaoBaixa(
  empresaId: number,
  req: OperacaoBaixaConsignadoRequest,
): Promise<OperacaoBaixaConsignadoDTO> {
  const sub = await getSub()
  const res = await api.post<OperacaoBaixaConsignadoDTO>(
    `/empresas/${empresaId}/operacoes-baixa-consignado`,
    req,
    { auth0Sub: sub },
  )
  if (!res.sucesso || !res.dados) throw new Error(res.mensagem ?? 'Erro ao salvar operação.')
  return res.dados
}

export async function listarOperacoesBaixa(
  empresaId: number,
  page = 1,
  pageSize = 20,
): Promise<PagedResponse<OperacaoBaixaConsignadoDTO>> {
  const sub = await getSub()
  const res = await api.get<PagedResponse<OperacaoBaixaConsignadoDTO>>(
    `/empresas/${empresaId}/operacoes-baixa-consignado?page=${page}&pageSize=${pageSize}`,
    { auth0Sub: sub },
  )
  return res.dados ?? { dados: [], pagina: page, tamanhoPagina: pageSize, total: 0 }
}

export async function deletarOperacaoBaixa(
  empresaId: number,
  id: number,
): Promise<void> {
  const sub = await getSub()
  const res = await api.delete<null>(
    `/empresas/${empresaId}/operacoes-baixa-consignado/${id}`,
    { auth0Sub: sub },
  )
  if (!res.sucesso) throw new Error(res.mensagem ?? 'Erro ao excluir operação.')
}

export async function atualizarOperacaoBaixa(
  empresaId: number,
  id: number,
  req: OperacaoBaixaConsignadoRequest,
): Promise<OperacaoBaixaConsignadoDTO> {
  const sub = await getSub()
  const res = await api.put<OperacaoBaixaConsignadoDTO>(
    `/empresas/${empresaId}/operacoes-baixa-consignado/${id}`,
    req,
    { auth0Sub: sub },
  )
  if (!res.sucesso || !res.dados) throw new Error(res.mensagem ?? 'Erro ao atualizar operação.')
  return res.dados
}