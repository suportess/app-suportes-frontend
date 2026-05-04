import { redirect } from 'next/navigation'
import { SidebarProvider } from '@/components/shell/sidebar-context'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'
import { UserProvider } from '@/components/providers/user-context'
import { getSession } from '@/lib/session'
import { api } from '@/lib/api'
import type { UsuarioDTO } from '@/lib/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // Provisiona o usuário no backend (cria se não existir, atualiza se já existir)
  let usuario: UsuarioDTO | null = null
  try {
    const res = await api.post<UsuarioDTO>('/usuarios/me', {
      auth0Sub  : session.sub,
      email     : session.email   ?? '',
      nmUsuario : session.name    ?? null,
      picture   : session.picture ?? null,
    })
    usuario = res.dados
  } catch {
    // Não bloqueia o acesso ao dashboard se o backend estiver indisponível
  }

  return (
    <UserProvider usuario={usuario}>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </UserProvider>
  )
}
