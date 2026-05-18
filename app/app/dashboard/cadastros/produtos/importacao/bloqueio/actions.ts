'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

async function getSub(): Promise<string> {
  const s = await getSession()
  if (!s) redirect('/login')
  return s.sub
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8031/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type BloqueioLoteDTO = {
  id:            number
  nm_usuario:    string | null
  email_usuario: string | null
  nm_empresa:    string | null
  dt_bloqueio:   string
  qt_itens:      number
  qt_sucesso:    number
  qt_erro:       number
}

export type ItemBloqueioResult = {
  cd_produto: number
  acao:       string
  sn_sucesso: boolean
  ds_erro:    string | null
}

export type RegistrarResult =
  | { ok: true;  lote: BloqueioLoteDTO }
  | { ok: false; erro: string }

// ─── Registrar lote após execução ─────────────────────────────────────────────

export async function registrarBloqueioLote(
  itens: ItemBloqueioResult[],
): Promise<RegistrarResult> {
  try {
    const sub = await getSub()
    const res = await fetch(`${BASE}/produtos/bloqueio/historico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth0-Sub': sub },
      body: JSON.stringify({ itens }),
      cache: 'no-store',
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.mensagem ?? 'Erro ao registrar histórico.')
    return { ok: true, lote: json.dados as BloqueioLoteDTO }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

// ─── Listar lotes ─────────────────────────────────────────────────────────────

export async function listarBloqueioLotes(): Promise<BloqueioLoteDTO[]> {
  try {
    const sub = await getSub()
    const res = await fetch(`${BASE}/produtos/bloqueio/historico`, {
      headers: { 'X-Auth0-Sub': sub },
      cache: 'no-store',
    })
    const json = await res.json()
    return (json.dados as BloqueioLoteDTO[]) ?? []
  } catch {
    return []
  }
}
