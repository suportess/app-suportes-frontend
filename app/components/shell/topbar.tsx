'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, LogOut, User, Sun, Moon, ChevronDown, Building2, Check } from 'lucide-react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSidebar } from './sidebar-context'
import { navGroups } from './nav-config'
import { useUsuario } from '@/components/providers/user-context'
import type { EmpresaDTO } from '@/lib/types'

function usePageTitle() {
  const pathname = usePathname()
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.href === '/dashboard' && pathname === '/dashboard') return item.label
      if (item.href !== '/dashboard' && pathname.startsWith(item.href)) {
        if (item.children) {
          for (const child of item.children) {
            if (pathname.startsWith(child.href)) return `${item.label} — ${child.label}`
          }
        }
        return item.label
      }
    }
  }
  return 'Portal'
}

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function Topbar() {
  const { setMobileOpen } = useSidebar()
  const { usuario, empresaAtiva, switchEmpresa, switching } = useUsuario()
  const router = useRouter()
  const title = usePageTitle()
  const [isDark, setIsDark] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [empresaMenuOpen, setEmpresaMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const empresaMenuRef = useRef<HTMLDivElement>(null)

  const nomeExibido  = usuario?.nmUsuario ?? usuario?.email ?? 'Usuário'
  const iniciaisAvatar = nomeExibido.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  // Empresas disponíveis para troca (vindas do usuario.empresas via UsuarioEmpresaDTO → precisamos mapear)
  // O backend retorna as empresas como UsuarioEmpresaDTO; para o switch precisamos do EmpresaDTO completo.
  // Guardamos a lista parcial e ao clicar usamos o id + nmEmpresa para atualizar otimisticamente.
  const empresasVinculadas = usuario?.empresas ?? []

  function handleSair() {
    setMenuOpen(false)
    router.push('/auth/signout')
  }

  useEffect(() => {
    const stored = localStorage.getItem('portal-theme')
    const dark = stored !== 'light'
    setIsDark(dark)
    applyTheme(dark)
  }, [])

  function toggleTheme() {
    const newDark = !isDark
    setIsDark(newDark)
    document.body.classList.add('theme-transition')
    applyTheme(newDark)
    localStorage.setItem('portal-theme', newDark ? 'dark' : 'light')
    setTimeout(() => document.body.classList.remove('theme-transition'), 300)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (empresaMenuRef.current && !empresaMenuRef.current.contains(e.target as Node)) {
        setEmpresaMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header
      className="sticky top-0 z-30 flex items-center h-14 px-4 gap-3 border-b flex-shrink-0"
      style={{
        background: 'var(--d2b-topbar-bg)',
        borderColor: 'var(--d2b-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Botão menu mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden p-2 rounded-lg transition-colors flex-shrink-0"
        style={{ color: 'var(--d2b-text-secondary)' }}
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {/* Título da página */}
      <h1 className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--d2b-text-primary)' }}>
        {title}
      </h1>

      {/* Ações */}
      <div className="flex items-center gap-1">
        {/* Seletor de empresa ativa */}
        {empresasVinculadas.length > 0 && (
          <div className="relative" ref={empresaMenuRef}>
            <button
              onClick={() => setEmpresaMenuOpen(o => !o)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                background: empresaAtiva ? 'var(--brand-muted)' : 'var(--warning-muted)',
                color: empresaAtiva ? 'var(--brand)' : 'var(--warning)',
                border: `1px solid ${empresaAtiva ? 'transparent' : 'var(--warning-border)'}`,
                opacity: switching ? 0.6 : 1,
              }}
              title={empresaAtiva ? 'Trocar empresa' : 'Selecione uma empresa'}
            >
              <Building2 size={13} />
              <span className="max-w-[140px] truncate font-medium">
                {empresaAtiva ? empresaAtiva.nmEmpresa : 'Selecionar empresa'}
              </span>
              <ChevronDown size={11} />
            </button>

            {empresaMenuOpen && (
              <div
                className="absolute left-0 top-full mt-1 w-56 rounded-xl border shadow-xl z-50 py-1.5 overflow-hidden"
                style={{ background: 'var(--d2b-bg-elevated)', borderColor: 'var(--d2b-border-strong)' }}
              >
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>
                  {empresaAtiva ? 'Trocar empresa' : 'Selecionar empresa'}
                </p>
                {empresasVinculadas.map(e => {
                  const isAtiva = empresaAtiva?.id === e.empresaId
                  const empresaDTO: EmpresaDTO = {
                    id: e.empresaId,
                    nmEmpresa: e.nmEmpresa,
                    dsRazaoSocial: null, nrCnpj: null, dsEmail: null,
                    nrTelefone: null, apikey: '', dsHostPortal: null,
                    snAtivo: 'S', dtCriacao: '', dtAtualizacao: '',
                  }
                  return (
                    <button
                      key={e.empresaId}
                      onClick={() => { switchEmpresa(empresaDTO); setEmpresaMenuOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                      style={{ color: isAtiva ? 'var(--brand)' : 'var(--d2b-text-secondary)' }}
                      onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)' }}
                      onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <Building2 size={14} />
                      <span className="flex-1 text-left truncate">{e.nmEmpresa}</span>
                      {isAtiva && <Check size={13} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Notificações */}
        <button
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: 'var(--d2b-text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-secondary)' }}
          aria-label="Notificações"
        >
          <Bell size={18} />
        </button>

        {/* Toggle tema claro/escuro */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--d2b-text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-secondary)' }}
          aria-label="Alternar tema"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Avatar / Menu usuário */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--d2b-text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {usuario?.picture ? (
              <Image
                src={usuario.picture}
                alt={nomeExibido}
                width={28}
                height={28}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'var(--brand)' }}
              >
                {iniciaisAvatar}
              </div>
            )}
            <span className="hidden sm:block text-sm" style={{ color: 'var(--d2b-text-primary)' }}>
              {nomeExibido}
            </span>
            <ChevronDown size={14} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-52 rounded-xl border shadow-xl z-50 py-1.5 overflow-hidden"
              style={{ background: 'var(--d2b-bg-elevated)', borderColor: 'var(--d2b-border-strong)' }}
            >
              <div className="px-3 py-2 border-b mb-1" style={{ borderColor: 'var(--d2b-border)' }}>
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--d2b-text-primary)' }}>
                  {nomeExibido}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--d2b-text-muted)' }}>
                  {usuario?.email ?? ''}
                </p>
                {empresaAtiva && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Building2 size={10} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    <p className="text-[10px] truncate font-medium" style={{ color: 'var(--brand)' }}>
                      {empresaAtiva.nmEmpresa}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                style={{ color: 'var(--d2b-text-secondary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-primary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-secondary)' }}
              >
                <User size={15} />
                <span>Meu Perfil</span>
              </button>

              <button
                onClick={handleSair}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                style={{ color: 'var(--d2b-text-secondary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)'; (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--d2b-text-secondary)' }}
              >
                <LogOut size={15} />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
