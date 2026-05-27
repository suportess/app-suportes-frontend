'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { EmpresaDTO, UsuarioDTO } from '@/lib/types'
import * as XLSX from 'xlsx'

function normalizeHeader(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const HEADER_ALIASES: Record<string, string> = {
  ds_produto: 'ds_produto',
  nome: 'ds_produto',
  descricao: 'ds_produto',
  sn_lote: 'sn_lote',
  sn_validade: 'sn_validade',
  sn_medicamento: 'sn_medicamento',
  sn_consignado: 'sn_consignado',
  opme_nexo: 'opme_nexo',
  cd_tip_ativ: 'cd_tip_ativ',
  codigo_anvisa: 'codigo_anvisa',
  cd_pro_fat: 'cd_pro_fat',
  ds_pro_fat: 'ds_pro_fat',
  cd_pro_fat_sus: 'cd_pro_fat_sus',
  pro_fat_sus: 'cd_pro_fat_sus',
  procedimento_sus: 'cd_procedimento_sus',
  cd_procedimento_sus: 'cd_procedimento_sus',
  cd_procediento_sus: 'cd_procedimento_sus',
  valor_inicial_produto: 'valor_inicial_produto',
  cd_especie: 'cd_especie',
  cd_classe: 'cd_classe',
  cd_sub_cla: 'cd_sub_cla',
  cd_unidade: 'cd_unidade',
  cd_produto: 'cd_produto',
  acao: 'acao',
}

function toCanonicalHeader(header: string): string {
  const normalized = normalizeHeader(header)
  return HEADER_ALIASES[normalized] ?? normalized
}

async function getSub(): Promise<string> {
  const s = await getSession()
  if (!s) redirect('/login')
  return s.sub
}

// ─── Empresa ativa ────────────────────────────────────────────────────────────

export async function getEmpresaAtiva(): Promise<EmpresaDTO | null> {
  const sub = await getSub()
  const res = await api.get<UsuarioDTO>('/usuarios/me', { auth0Sub: sub })
  const empresaAtiva = res.dados?.empresaAtiva ?? null
  if (!empresaAtiva?.dsHostPortal) return null
  return empresaAtiva
}

// ─── Parsear planilha (server-side, sem limite de memória do browser) ─────────

export type ParseResult =
  | { ok: true;  headers: string[]; rows: Record<string, string>[]; total: number }
  | { ok: false; erro: string }

export async function parsearPlanilha(formData: FormData): Promise<ParseResult> {
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
      raw:    false,   // converte tudo para string legível
    })

    if (rawRows.length === 0) return { ok: false, erro: 'A planilha não contém dados.' }

    // Converte para objetos plain (XLSX pode retornar objetos com protótipos/métodos
    // que o Next.js não consegue serializar ao passar de Server → Client Component)
    const rows: Record<string, string>[] = rawRows.map(row => {
      const plain: Record<string, string> = {}
      for (const key of Object.keys(row)) {
        const canonicalKey = toCanonicalHeader(key)
        const value = String(row[key] ?? '')

        // Keep first non-empty value when aliases collapse into the same canonical key.
        if (!(canonicalKey in plain) || (!plain[canonicalKey] && value)) {
          plain[canonicalKey] = value
        }
      }
      return plain
    })

    const headers = Object.keys(rows[0] ?? {})

    return { ok: true, headers, rows, total: rows.length }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao processar o arquivo.'
    return { ok: false, erro: msg }
  }
}

// ─── Cadastrar produto ────────────────────────────────────────────────────────

// ─── Lote de importação ─────────────────────────────────────────────────────

export type ImportacaoLoteDTO = {
  id:            number
  nm_usuario:    string | null
  email_usuario: string | null
  nm_empresa:    string | null
  dt_importacao: string
  qt_produtos:   number
}

export async function criarLote(): Promise<ImportacaoLoteDTO> {
  const sub = await getSub()
  const res = await api.post<ImportacaoLoteDTO>('/produtos/importacoes/lotes', {}, { auth0Sub: sub })
  if (!res.dados) throw new Error('Falha ao criar lote de importação.')
  return res.dados
}

export async function listarLotes(): Promise<ImportacaoLoteDTO[]> {
  const sub = await getSub()
  const res = await api.get<ImportacaoLoteDTO[]>('/produtos/importacoes/lotes', { auth0Sub: sub })
  return res.dados ?? []
}

// ─── Cadastrar produto ────────────────────────────────────────────────────────

export type CadastroProdutoPayload = {
  ds_produto:           string
  ds_comercial?:        string
  ds_especificacao?:    string
  sn_lote:              string
  sn_validade:          string
  sn_medicamento:       string
  sn_consignado:        string
  sn_opme?:             string
  tp_sexo:              string
  cd_especie:           number
  cd_classe:            number
  cd_sub_cla:           number
  ds_sub_cla:           string
  cd_unidade:           string
  cd_tip_ativ?:         number
  cd_sican?:            string
  cd_pro_fat?:          string
  ds_pro_fat?:          string
  cd_pro_fat_sus?:      string
  cd_procedimento_sus?: string
  valor_inicial_produto?: number
  empresas:             number[]
  cd_lote?:             number
}

export type CadastroResult =
  | { ok: true; cdProduto?: number }
  | { ok: false; erro: string }

export async function cadastrarProduto(payload: CadastroProdutoPayload): Promise<CadastroResult> {
  try {
    const sub = await getSub()
    // Remove campos undefined/null/vazio e strings "$undefined" (artefato de serialização
    // do Next.js Server Actions que converte undefined em "$undefined" no protocolo RSC).
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([, v]) =>
        v !== undefined && v !== null && v !== '' && v !== '$undefined'
      )
    ) as CadastroProdutoPayload
    const res = await api.post<{ ds_produto: string; cd_produto?: number }>('/produtos', clean, { auth0Sub: sub })
    return { ok: true, cdProduto: res.dados?.cd_produto ?? undefined }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao cadastrar produto.' }
  }
}

// ─── Bloquear / Desbloquear produto ──────────────────────────────────────────

export type BloquearResult =
  | { ok: true;  acao: string; cdProduto: number }
  | { ok: false; erro: string }

export async function bloquearProduto(cdProduto: number, acao: 'BLOQUEIO' | 'DESBLOQUEIO'): Promise<BloquearResult> {
  try {
    const sub = await getSub()
    await api.post('/produtos/bloqueio', { cd_produto: cdProduto, acao }, { auth0Sub: sub })
    return { ok: true, acao, cdProduto }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : `Erro ao executar ${acao}.` }
  }
}
