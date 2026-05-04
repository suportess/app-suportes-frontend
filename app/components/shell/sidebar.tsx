'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, X, ChevronDown, Search, Lock } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import logo from '@/suportes-icone.png'
import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar-context'
import { useUsuario } from '@/components/providers/user-context'
import { navGroups, type NavItem } from './nav-config'

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center justify-start w-full py-1 select-none">
      <Image src={logo} alt="Suportes" width={collapsed ? 60 : 108} height={collapsed ? 60 : 108} className="rounded-xl object-contain" priority />
    </div>
  )
}

function SidebarSearch({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null
  return (
    <div className="px-2 pb-2">
      <div
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs"
        style={{ background: 'var(--d2b-hover)', color: 'var(--d2b-text-muted)' }}
      >
        <Search size={13} className="flex-shrink-0" />
        <span>Pesquisar no menu</span>
      </div>
    </div>
  )
}

function NavItemWithChildren({
  item,
  collapsed,
  onClose,
  disabled = false,
  isOperador = false,
}: {
  item: NavItem
  collapsed: boolean
  onClose: () => void
  disabled?: boolean
  isOperador?: boolean
}) {
  const pathname = usePathname()
  const isActive = !disabled && pathname.startsWith(item.href)
  const [open, setOpen] = useState(isActive)
  const Icon = item.icon

  if (collapsed) {
    if (disabled) {
      return (
        <li>
          <span
            className="relative flex items-center justify-center rounded-lg px-0 py-2 cursor-not-allowed opacity-35"
            style={{ color: 'var(--d2b-text-secondary)' }}
            title={item.label}
          >
            <Icon size={18} className="flex-shrink-0" />
          </span>
        </li>
      )
    }
    return (
      <li>
        <Link
          href={item.href}
          onClick={onClose}
          className="group relative flex items-center justify-center rounded-lg px-0 py-2 text-sm font-medium transition-all duration-150"
          style={{
            color: isActive ? 'var(--d2b-text-primary)' : 'var(--d2b-text-secondary)',
            background: isActive ? 'var(--d2b-active)' : 'transparent',
          }}
          onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-primary)' } }}
          onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-secondary)' } }}
          title={item.label}
        >
          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[var(--brand)]" />}
          <Icon size={18} className={cn('flex-shrink-0', isActive ? 'text-[var(--brand)]' : 'text-current')} />
          <span className="pointer-events-none absolute left-full ml-2 z-50 hidden group-hover:flex items-center whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-xl"
            style={{ background: 'var(--d2b-bg-elevated)', borderColor: 'var(--d2b-border-strong)', color: 'var(--d2b-text-primary)' }}>
            {item.label}
          </span>
        </Link>
      </li>
    )
  }

  if (disabled) {
    return (
      <li>
        <span
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium cursor-not-allowed opacity-35"
          style={{ color: 'var(--d2b-text-secondary)' }}
        >
          <Icon size={18} className="flex-shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          <Lock size={12} className="flex-shrink-0 opacity-60" />
        </span>
      </li>
    )
  }

  return (
    <li>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150"
        style={{
          color: isActive ? 'var(--d2b-text-primary)' : 'var(--d2b-text-secondary)',
          background: isActive ? 'var(--d2b-active)' : 'transparent',
        }}
        onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-primary)' } }}
        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-secondary)' } }}
      >
        <Icon size={18} className={cn('flex-shrink-0', isActive ? 'text-[var(--brand)]' : 'text-current')} />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown size={14} className={cn('flex-shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <ul className="mt-0.5 ml-4 space-y-0.5 border-l pl-3" style={{ borderColor: 'var(--d2b-border)' }}>
          {item.children!.filter(child => !(isOperador && child.requiresAdmin)).map(child => {
            const childActive = pathname === child.href || pathname.startsWith(child.href + '/')
            const ChildIcon = child.icon
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-150"
                  style={{
                    color: childActive ? 'var(--d2b-text-primary)' : 'var(--d2b-text-secondary)',
                    background: childActive ? 'var(--d2b-active)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!childActive) { (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-primary)' } }}
                  onMouseLeave={e => { if (!childActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-secondary)' } }}
                >
                  <ChildIcon size={15} className={cn('flex-shrink-0', childActive ? 'text-[var(--brand)]' : 'text-current')} />
                  <span className="truncate">{child.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

export function Sidebar() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar()
  const { usuario } = useUsuario()
  const pathname = usePathname()

  // Itens de menu só ficam habilitados se o usuário tiver pelo menos 1 empresa vinculada.
  // A seção "Sistema / Configurações" é sempre acessível (href começa com /dashboard/configuracoes).
  const semEmpresa = !usuario || (usuario.empresas?.length ?? 0) === 0
  const isOperador = usuario?.tipo === 'OPERADOR'

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  // Determina se um grupo/item deve ser desabilitado
  function isDisabled(href: string): boolean {
    if (!semEmpresa) return false
    // Configurações sempre liberado
    if (href.startsWith('/dashboard/configuracoes')) return false
    return true
  }

  const inner = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn('flex items-center h-14 px-3 flex-shrink-0 border-b', collapsed ? 'justify-center' : 'justify-between')}
        style={{ borderColor: 'var(--d2b-border)' }}
      >
        <Logo collapsed={collapsed} />

        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--d2b-text-secondary)' }}
          aria-label="Fechar menu"
        >
          <X size={16} />
        </button>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="hidden md:flex p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--d2b-text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            aria-label="Recolher menu"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Busca */}
      <div className="pt-2">
        <SidebarSearch collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.title && !collapsed && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--d2b-text-muted)' }}>
                {group.title}
              </p>
            )}
            {group.title && collapsed && (
              <div className="mx-auto mb-1 w-4 h-px" style={{ background: 'var(--d2b-border)' }} />
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const itemDisabled = isDisabled(item.href)

                if (item.children && item.children.length > 0) {
                  return (
                    <NavItemWithChildren
                      key={item.href}
                      item={item}
                      collapsed={collapsed}
                      onClose={() => setMobileOpen(false)}
                      disabled={itemDisabled}
                      isOperador={isOperador}
                    />
                  )
                }

                const active = !itemDisabled && isActive(item.href)
                const Icon = item.icon

                if (itemDisabled) {
                  return (
                    <li key={item.href}>
                      <span
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium cursor-not-allowed opacity-35',
                          collapsed && 'justify-center px-0',
                        )}
                        style={{ color: 'var(--d2b-text-secondary)' }}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon size={18} className="flex-shrink-0" />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      </span>
                    </li>
                  )
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                        collapsed && 'justify-center px-0',
                      )}
                      style={{
                        color: active ? 'var(--d2b-text-primary)' : 'var(--d2b-text-secondary)',
                        background: active ? 'var(--d2b-active)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-primary)' } }}
                      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-secondary)' } }}
                      title={collapsed ? item.label : undefined}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[var(--brand)]" />
                      )}

                      <Icon size={18} className={cn('flex-shrink-0 transition-colors', active ? 'text-[var(--brand)]' : 'text-current')} />

                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--brand)] text-[10px] font-bold text-white flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}

                      {collapsed && (
                        <span className="pointer-events-none absolute left-full ml-2 z-50 hidden group-hover:flex items-center whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-xl"
                          style={{ background: 'var(--d2b-bg-elevated)', borderColor: 'var(--d2b-border-strong)', color: 'var(--d2b-text-primary)' }}>
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {collapsed && (
        <div className="flex justify-center p-2 border-t" style={{ borderColor: 'var(--d2b-border)' }}>
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--d2b-text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            aria-label="Expandir menu"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn('hidden md:flex flex-col flex-shrink-0 h-screen border-r transition-all duration-200', collapsed ? 'w-14' : 'w-56')}
        style={{ background: 'var(--d2b-bg-surface)', borderColor: 'var(--d2b-border)' }}
      >
        {inner}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ background: 'rgba(0,0,0,0.5)' }}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn('fixed inset-y-0 left-0 z-50 flex flex-col w-56 md:hidden transition-transform duration-200', mobileOpen ? 'translate-x-0' : '-translate-x-full')}
        style={{ background: 'var(--d2b-bg-surface)', borderRight: '1px solid var(--d2b-border)' }}
      >
        {inner}
      </aside>
    </>
  )
}
