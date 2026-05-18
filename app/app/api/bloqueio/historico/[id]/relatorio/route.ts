import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8031/api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const upstream = await fetch(
    `${BASE}/produtos/bloqueio/historico/${id}/relatorio`,
    { headers: { 'X-Auth0-Sub': session.sub }, cache: 'no-store' },
  )

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: upstream.status })
  }

  const buffer = await upstream.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="relatorio-bloqueio-${id}.xlsx"`,
    },
  })
}
