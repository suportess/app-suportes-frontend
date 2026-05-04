/**
 * Proxy para o backend Java — não chama o ngrok diretamente.
 * NGROK_API_KEY fica apenas no backend.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8031/api'

async function getAuth0Sub(): Promise<string | null> {
  try {
    const session = await getSession()
    return session?.sub ?? null
  } catch {
    return null
  }
}

/** POST /api/ngrok/domain — cria domínio via backend Java */
export async function POST(_request: NextRequest) {
  const sub = await getAuth0Sub()
  if (!sub) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  try {
    const res = await fetch(`${BACKEND}/ngrok/reserved-domains/generate`, {
      method : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth0-Sub' : sub,
      },
    })

    const data = await res.json() as { dados?: { id: string; domain: string }; mensagem?: string }

    if (!res.ok) {
      return NextResponse.json(
        { error: data.mensagem ?? 'Erro ao criar domínio ngrok.' },
        { status: res.status },
      )
    }

    return NextResponse.json({
      id    : data.dados!.id,
      domain: data.dados!.domain,
    })
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conectar ao backend.' },
      { status: 502 },
    )
  }
}

/** DELETE /api/ngrok/domain?id={domainId} — remove domínio via backend Java */
export async function DELETE(request: NextRequest) {
  const sub = await getAuth0Sub()
  if (!sub) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Parâmetro id obrigatório.' }, { status: 400 })
  }

  try {
    const res = await fetch(`${BACKEND}/ngrok/reserved-domains/${encodeURIComponent(id)}`, {
      method : 'DELETE',
      headers: { 'X-Auth0-Sub': sub },
    })

    if (!res.ok && res.status !== 404) {
      const data = await res.json().catch(() => ({})) as { mensagem?: string }
      return NextResponse.json(
        { error: data.mensagem ?? 'Erro ao apagar domínio ngrok.' },
        { status: res.status },
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conectar ao backend.' },
      { status: 502 },
    )
  }
}
