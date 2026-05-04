import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { UsuarioDTO } from '@/lib/types'
import { Building2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let usuario: UsuarioDTO | null = null
  try {
    const res = await api.get<UsuarioDTO>('/usuarios/me', { auth0Sub: session.sub })
    usuario = res.dados ?? null
  } catch {
    // backend indisponível — continua e mostra tela informativa
  }

  // Se já tem empresa vinculada → vai direto para movimentos
  if (usuario && (usuario.empresas?.length ?? 0) > 0) {
    redirect('/dashboard/movimentos')
  }

  // Sem empresa vinculada → tela informativa
  return (
    <div className="flex items-center justify-center min-h-full p-6">
      <div className="max-w-md w-full space-y-6 text-center">

        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--warning-muted)' }}
        >
          <Building2 size={28} style={{ color: 'var(--warning)' }} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Bem-vindo ao Suportes
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Sua conta ainda não está vinculada a nenhuma empresa. Para acessar os módulos do sistema,
            um administrador precisa vincular sua conta a uma empresa.
          </p>
        </div>

        <div
          className="card p-4 text-left space-y-3"
          style={{ borderColor: 'var(--warning)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            O que fazer agora
          </p>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ background: 'var(--warning)' }} />
              Entre em contato com o administrador do sistema
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ background: 'var(--warning)' }} />
              Solicite o vínculo da sua conta com a empresa correta
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ background: 'var(--warning)' }} />
              Após o vínculo, recarregue a página para acessar o sistema
            </li>
          </ul>
        </div>

        <Link
          href="/dashboard/configuracoes/empresa"
          className="btn-gradient inline-flex items-center gap-2"
        >
          Ir para Configurações
          <ArrowRight size={14} />
        </Link>

      </div>
    </div>
  )
}
