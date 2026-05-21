'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'
import type { TipoMovimento } from './_lib/saldos-utils'

async function getSub(): Promise<string> {
  const s = await getSession()
  if (!s) redirect('/login')
  return s.sub
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ParseResult =
  | { ok: true;  headers: string[]; rows: Record<string, string>[]; total: number }
  | { ok: false; erro: string }


// ─── Parsear planilha (server-side) ──────────────────────────────────────────

export async function parsearPlanilhaSaldos(formData: FormData): Promise<ParseResult> {
  try {
    const file = formData.get('file')
    if (!(file instanceof File)) return { ok: false, erro: 'Nenhum arquivo recebido.' }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      return { ok: false, erro: 'Formato inválido. Use .xlsx, .xls ou .csv' }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return { ok: false, erro: 'Planilha sem abas.' }

    const sheet = workbook.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw:    false,
    })

    if (rawRows.length === 0) return { ok: false, erro: 'A planilha não contém dados.' }

    const rows: Record<string, string>[] = rawRows.map(row => {
      const plain: Record<string, string> = {}
      for (const key of Object.keys(row)) {
        plain[key] = String(row[key] ?? '')
      }
      return plain
    })

    // Verifica se existe coluna de saldo
    const headers = Object.keys(rows[0])
    const saldoKey = headers.find(h =>
      h.toLowerCase().replace(/[^a-z]/g, '') === 'saldo'
    )
    if (!saldoKey) {
      return { ok: false, erro: 'Coluna "saldo" não encontrada na planilha. Verifique o modelo.' }
    }

    // Valida que todas as linhas têm saldo preenchido
    const semSaldo = rows.filter(r => !r[saldoKey] || r[saldoKey].trim() === '').length
    if (semSaldo > 0) {
      return { ok: false, erro: `${semSaldo} linha(s) sem saldo preenchido. O campo saldo é obrigatório.` }
    }

    return { ok: true, headers, rows, total: rows.length }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao processar o arquivo.'
    return { ok: false, erro: msg }
  }
}

// ─── Importar saldos no backend ───────────────────────────────────────────────

export type SaldoItemPayload = {
  produto?:    string
  estoque?:    string
  fornecedor?: string
  unidade?:    string
  saldo:       string
  movimento:   TipoMovimento
}

export type ImportacaoSaldosResult =
  | { ok: true;  importados: number }
  | { ok: false; erro: string }

export async function importarSaldos(
  itens: SaldoItemPayload[],
): Promise<ImportacaoSaldosResult> {
  try {
    const sub = await getSub()
    const res = await api.post<{ importados: number }>(
      '/saldos/importar',
      { itens },
      { auth0Sub: sub },
    )
    return { ok: true, importados: res.dados?.importados ?? itens.length }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao importar saldos.' }
  }
}

// ─── Consultar saldo atual de cada item no Oracle ─────────────────────────────

export type ConsultaItemPayload = {
  cdProduto:    string
  cdEstoque?:   string
  cdFornecedor?: string
  cdUnidade?:   string
}

export type ConsultaResultItem = {
  CD_PRODUTO:          number
  DS_PRODUTO:          string
  SN_CONSIGNADO:       string
  CD_ESTOQUE?:         number
  DS_ESTOQUE?:         string
  CD_FORNECEDOR?:      number
  NM_FORNECEDOR?:      string
  CD_UNIDADE?:         string
  DS_UNIDADE?:         string
  UNIDADE:             { CD_UNIDADE: string | null; DS_UNIDADE: string | null; VL_FATOR: number | null }
  TOTAL_ESTOQUE:       number
  TOTAL_FICHA_ESTOQUE: number
  TOTAL_CONSIG_FORN:   number
  TOTAL_LOTES:         number
  SALDO_ESTOQUE:       Array<{ CD_ESTOQUE: number; DS_ESTOQUE: string; QT_ESTOQUE_ATUAL: number }>
  FICHA_ESTOQUE:       Array<{ CD_ESTOQUE: number; DS_ESTOQUE: string; QT_SALDO_ESTOQUE: number }>
  SALDO_CONSIG_FORN:   Array<{ CD_FORNECEDOR: number; NM_FORNECEDOR: string; CD_ESTOQUE: number; SALDO_DISPONIVEL: number }>
  SALDO_LOTES:         Array<{ CD_ESTOQUE: number; QT_ESTOQUE_LOTE: number }>
  ERRO?:               boolean
  erro?:               string
}

export type ConsultaSaldosResult =
  | { ok: true;  itens: ConsultaResultItem[] }
  | { ok: false; erro: string }

export async function consultarSaldos(
  itens: ConsultaItemPayload[],
): Promise<ConsultaSaldosResult> {
  try {
    const sub = await getSub()
    const payload = itens.map(i => ({
      cdProduto:    i.cdProduto    ? Number(i.cdProduto)    : undefined,
      cdEstoque:    i.cdEstoque    ? Number(i.cdEstoque)    : undefined,
      cdFornecedor: i.cdFornecedor ? Number(i.cdFornecedor) : undefined,
      cdUnidade:    i.cdUnidade    || undefined,
    }))
    const res = await api.post<ConsultaResultItem[]>(
      '/saldos/consultar',
      { itens: payload },
      { auth0Sub: sub },
    )
    return { ok: true, itens: res.dados ?? [] }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao consultar saldos.' }
  }
}

// ─── Devolver item (devolução linha a linha) ──────────────────────────────────

export type DevolucaoItemPayload = {
  cdSessao?:       number
  nrLinha:         number
  cdProduto:       string
  dsProduto?:      string
  cdEstoque?:      string
  dsEstoque?:      string
  cdFornecedor?:   string
  nmFornecedor?:   string
  cdUnidade?:      string
  dsUnidade?:      string
  qtDevolvida:     number
  tpMovimento:     string
  cdMotDev?:       number
  tpDevolucao?:    string
  saldoEstoque?:   number
  saldoFicha?:     number
  saldoConsigForn?: number
  saldoLotes?:     number
}

export type DevolucaoOracleItem = {
  cd_devolucao:   number
  cd_ent_pro:     number
  cd_itent_pro:   number
  cd_fornecedor:  number
  cd_estoque:     number
  cd_uni_pro:     number
  cd_custo_medio: number
  qt_devolvida:   number
  vl_total:       number
  itens:          Array<{ cd_itdev_for: number; cd_lote: string | null; dt_validade: string | null; qt: number }>
}

export type DevolverItemResult =
  | { ok: true;  cdItem?: number; cdSessao?: number; status: string; qtTotalDevolvida?: number; qtNaoAtendida?: number; mensagem?: string; devolucoes?: DevolucaoOracleItem[]; entrada?: Record<string, unknown>; oracleRaw?: Record<string, unknown> }
  | { ok: false; cdItem?: number; cdSessao?: number; erro: string }

export async function devolverItem(
  payload: DevolucaoItemPayload,
): Promise<DevolverItemResult> {
  try {
    const sub = await getSub()
    const res = await api.post<{
      cdItem: number; cdSessao: number; status: string
      qtTotalDevolvida?: number; qtNaoAtendida?: number; mensagem?: string
      devolucoes?: DevolucaoOracleItem[]; entrada?: Record<string, unknown>
    }>(
      '/saldos/devolver-item',
      payload,
      { auth0Sub: sub },
    )
    const d = res.dados!
    return { ok: true, cdItem: d.cdItem, cdSessao: d.cdSessao, status: d.status,
             qtTotalDevolvida: d.qtTotalDevolvida, qtNaoAtendida: d.qtNaoAtendida,
             mensagem: d.mensagem, devolucoes: d.devolucoes, entrada: d.entrada }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao executar devolução.' }
  }
}

// ─── Transferência de grupo (cabeças + filhos em uma única transação Oracle) ──

export type TransferenciaGrupoPayload = {
  // Metadata para persistência no histórico (opcionais)
  cdSessao?:     number
  nrLinha?:      number
  cdProduto?:    string
  dsProduto?:    string | null
  cdEstoque?:    string | null
  dsEstoque?:    string | null
  cdFornecedor?: string | null
  nmFornecedor?: string | null
  cdUnidade?:    string | null
  dsUnidade?:    string | null
  cabecas: Array<{
    cdProduto:    number
    qtDev:        number
    cdEstoque:    number
    cdFornecedor?: number
    cdMotDev:     number
    // metadata por cabeça
    nrLinha?:      number
    dsProduto?:    string | null
    dsEstoque?:    string | null
    nmFornecedor?: string | null
    cdUnidade?:    string | null
    dsUnidade?:    string | null
  }>
  itens: Array<{
    cdProduto:    number
    qtEntrada:    number
    cdEstoque:    number
    cdFornecedor: number
    cdUnidade:    string
    cdLote?:       string | null
    dtValidade?:   string | null
    // metadata por filho
    nrLinha?:      number
    dsProduto?:    string | null
    dsEstoque?:    string | null
    nmFornecedor?: string | null
    dsUnidade?:    string | null
  }>
}

export async function transferirGrupo(
  payload: TransferenciaGrupoPayload,
): Promise<DevolverItemResult> {
  try {
    const sub = await getSub()
    const res = await api.post<Record<string, unknown>>(
      '/saldos/transferencia',
      payload,
      { auth0Sub: sub },
    )
    const oracle = res.dados as Record<string, unknown>
    const status = String(oracle?.status ?? 'erro')
    if (status === 'ok') {
      const qtTotal  = Number(oracle.qt_total_devolvida ?? 0)
      const devs     = Array.isArray(oracle.fase1_devolucoes) ? oracle.fase1_devolucoes as Record<string,unknown>[] : []
      const ents     = Array.isArray(oracle.fase2_entradas)   ? oracle.fase2_entradas   as Record<string,unknown>[] : []
      const cdDevFor = devs.length > 0 ? Number(devs[0].cd_devolucao) : undefined
      const cdEntPro = ents.length > 0 ? Number(ents[0].cd_ent_pro)   : undefined
      // cd_sessao é o ID da sessão de importação persistida no Postgres
      const cdSessaoPg = oracle.cd_sessao != null ? Number(oracle.cd_sessao) : cdEntPro
      return { ok: true, status: 'ok', qtTotalDevolvida: qtTotal, cdItem: cdDevFor, cdSessao: cdSessaoPg, oracleRaw: oracle }
    } else {
      const msg = String(oracle?.mensagem ?? 'Erro desconhecido no Oracle.')
      const cdSessaoPg = oracle?.cd_sessao != null ? Number(oracle.cd_sessao) : undefined
      return { ok: true, status: 'erro', mensagem: msg, cdSessao: cdSessaoPg, oracleRaw: oracle }
    }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao executar transferência.' }
  }
}

// ─── Histórico de importações ─────────────────────────────────────────────────

export type ImportacaoSaldosHistoricoDTO = {
  id:            number
  nm_usuario:    string | null
  email_usuario: string | null
  nm_empresa:    string | null
  dt_importacao: string
  qt_itens:      number
  qt_sucesso:    number
  qt_erro:       number
}

export type PagedResponse<T> = {
  dados:         T[]
  pagina:        number
  tamanhoPagina: number
  total:         number
}

export type ImportacaoDevolucaoItemDTO = {
  id:                  number
  cd_sessao:           number
  nr_linha:            number
  cd_produto:          string | null
  ds_produto:          string | null
  cd_estoque:          string | null
  ds_estoque:          string | null
  cd_fornecedor:       string | null
  nm_fornecedor:       string | null
  cd_unidade:          string | null
  ds_unidade:          string | null
  qt_devolvida:        number | null
  tp_movimento:        string | null
  st_execucao:         string
  qt_total_devolvida:  number | null
  qt_nao_atendida:     number | null
  ds_erro:             string | null
  json_resultado:      string | null
  dt_execucao:         string | null
}

export async function listarHistoricoSaldos(page = 0): Promise<PagedResponse<ImportacaoSaldosHistoricoDTO>> {
  try {
    const sub = await getSub()
    const res = await api.get<PagedResponse<ImportacaoSaldosHistoricoDTO>>(
      `/saldos/historico?page=${page}&size=10`,
      { auth0Sub: sub },
    )
    return res.dados ?? { dados: [], pagina: 0, tamanhoPagina: 10, total: 0 }
  } catch {
    return { dados: [], pagina: 0, tamanhoPagina: 10, total: 0 }
  }
}

export async function listarItensSessaoSaldos(id: number): Promise<ImportacaoDevolucaoItemDTO[]> {
  try {
    const sub = await getSub()
    const res = await api.get<ImportacaoDevolucaoItemDTO[]>(`/saldos/historico/${id}/itens`, { auth0Sub: sub })
    return res.dados ?? []
  } catch {
    return []
  }
}
