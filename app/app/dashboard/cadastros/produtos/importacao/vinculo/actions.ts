'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

async function getSub(): Promise<string> {
  const s = await getSession()
  if (!s) redirect('/login')
  return s.sub
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8031/api'

export type VinculoInput = {
  cdProdutoAntigo: number
  cdProdutoNovo:   number
}

export type VinculoResultItem = {
  cd_produto_antigo:   number
  ds_produto_antigo:   string
  cd_produto_novo:     number
  ds_produto_novo:     string
  cd_procedimento_sus: string
}

export type VincularSusResult =
  | { ok: true;  sessaoId: number; vinculos: VinculoResultItem[] }
  | { ok: false; erro: string }

export type VinculoSessaoDTO = {
  id:           number
  nmUsuario:    string | null
  emailUsuario: string | null
  nmEmpresa:    string | null
  dtVinculo:    string
  qtVinculos:   number
}

export async function vincularSusProduto(
  vinculos: VinculoInput[],
): Promise<VincularSusResult> {
  try {
    const sub = await getSub()
    const body = {
      vinculos: vinculos.map(v => ({
        cdProdutoAntigo: v.cdProdutoAntigo,
        cdProdutoNovo:   v.cdProdutoNovo,
      })),
    }
    const res = await fetch(`${BASE}/produtos/vinculo-sus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth0-Sub': sub },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.mensagem ?? 'Erro ao executar vinculo SUS.')
    const dados = json.dados as { sessao_id: number; vinculos: VinculoResultItem[] }
    return { ok: true, sessaoId: dados.sessao_id, vinculos: dados.vinculos }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function listarVinculos(): Promise<VinculoSessaoDTO[]> {
  try {
    const sub = await getSub()
    const res = await fetch(`${BASE}/produtos/vinculo-sus/historico`, {
      headers: { 'X-Auth0-Sub': sub },
      cache: 'no-store',
    })
    const json = await res.json()
    return (json?.dados ?? []) as VinculoSessaoDTO[]
  } catch {
    return []
  }
}