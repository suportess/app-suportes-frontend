'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { EmpresaDTO, UsuarioDTO } from '@/lib/types'
import * as XLSX from 'xlsx'

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
        plain[key] = String(row[key] ?? '')
      }
      return plain
    })

    const headers = Object.keys(rows[0])

    return { ok: true, headers, rows, total: rows.length }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao processar o arquivo.'
    return { ok: false, erro: msg }
  }
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
  tp_sexo:              string
  cd_especie:           number
  cd_classe:            number
  cd_sub_cla:           number
  ds_sub_cla:           string
  cd_unidade:           string
  cd_pro_fat?:          string
  cd_pro_fat_sus?:      string
  cd_procedimento_sus?: string
  empresas:             number[]
}

export type CadastroResult =
  | { ok: true; cdProduto?: number }
  | { ok: false; erro: string }

export async function cadastrarProduto(payload: CadastroProdutoPayload): Promise<CadastroResult> {
  try {
    const sub = await getSub()
    const res = await api.post<{ ds_produto: string; cd_produto?: number }>('/produtos', payload, { auth0Sub: sub })
    return { ok: true, cdProduto: res.dados?.cd_produto ?? undefined }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao cadastrar produto.' }
  }
}
