import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8031/api'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const upstream = await fetch(`${BASE}/produtos/bloqueio/historico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth0-Sub': session.sub },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const upstream = await fetch(`${BASE}/produtos/bloqueio/historico`, {
    headers: { 'X-Auth0-Sub': session.sub },
    cache: 'no-store',
  })
  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}
