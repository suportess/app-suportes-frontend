import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8031/api'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const tipo = req.nextUrl.searchParams.get('tipo') ?? 'padrao'
  const upstream = await fetch(`${BASE}/produtos/modelo?tipo=${tipo}`, {
    headers: { 'X-Auth0-Sub': session.sub },
    cache: 'no-store',
  })

  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'Erro ao gerar modelo' },
      { status: upstream.status },
    )
  }

  const buffer = await upstream.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="modelo_produtos_${tipo}.xlsx"`,
    },
  })
}
