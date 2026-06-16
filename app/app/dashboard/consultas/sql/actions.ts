'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { ConsultaRagRequest, ConsultaRagResponse } from '@/lib/types'

export type ActionResult<T = void> = { data?: T; error?: string }

async function getSub(): Promise<string> {
  const s = await getSession()
  if (!s) redirect('/login')
  return s.sub
}

export async function gerarSqlComIA(
  pergunta: string,
): Promise<ActionResult<{ sql: string }>> {
  try {
    const sub = await getSub()
    const res = await api.post<ConsultaRagResponse>(
      '/rag/consulta',
      { pergunta, topK: 5 } satisfies ConsultaRagRequest,
      { auth0Sub: sub },
    )
    return { data: { sql: res.dados?.sql ?? '' } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao gerar SQL.' }
  }
}

export async function executarConsulta(
  empresaId: number,
  sqlQuery: string,
): Promise<ActionResult<Record<string, unknown>[]>> {
  try {
    const sub = await getSub()
    const res = await api.post<Record<string, unknown>[]>(
      `/portal/mv/empresas/${empresaId}/consulta/generica`,
      { sql_query: sqlQuery },
      { auth0Sub: sub },
    )
    return { data: res.dados ?? [] }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao executar consulta.' }
  }
}
