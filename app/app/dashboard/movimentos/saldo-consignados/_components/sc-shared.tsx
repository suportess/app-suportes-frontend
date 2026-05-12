'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Loader2, Search, X } from 'lucide-react'
import type { FornecedorPortalDTO, ProdutoConsignadoPortalDTO } from '@/lib/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

export function fmtQtd(v: number | null | undefined) {
  if (v == null) return '-'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(v)
}

// ─── tipos locais ─────────────────────────────────────────────────────────────

export type Item = { id: string | number; label: string }

export type FornecedorLinha = {
  fornecedor: FornecedorPortalDTO
  quantidade: string
  lote: string
  validade: string
}

export type ItemAdicionado = {
  produto: ProdutoConsignadoPortalDTO
  snLote: 'S' | 'N'
  snValidade: 'S' | 'N'
  linhas: FornecedorLinha[]
}

// ─── configuração de ações ────────────────────────────────────────────────────

export const ACAO_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  DEVOLVER: { label: 'Devolver', color: 'var(--brand)',      bg: 'var(--brand-muted)',   desc: 'Registra devolução do saldo ao fornecedor' },
  BAIXAR:   { label: 'Baixar',   color: 'var(--success)',    bg: 'var(--success-muted)', desc: 'Baixa o saldo como utilizado' },
  IGNORAR:  { label: 'Ignorar',  color: 'var(--text-muted)', bg: 'var(--bg-elevated)',   desc: 'Mantém o saldo sem nenhuma ação' },
}

// ─── CampoLabel ───────────────────────────────────────────────────────────────

export function CampoLabel({ label }: { label: string }) {
  return (
    <span
      className="text-xs font-semibold uppercase tracking-wide"
      style={{ color: 'var(--text-muted)' }}
    >
      {label}
    </span>
  )
}

// ─── Combobox ─────────────────────────────────────────────────────────────────

export function Combobox({
  value, onChange, onConfirm, placeholder, items, disabled, loading: loadingItems,
}: {
  value: Item | null
  onChange: (item: Item | null) => void
  onConfirm?: () => void
  placeholder?: string
  items: Item[]
  disabled?: boolean
  loading?: boolean
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const containerRef        = useRef<HTMLDivElement>(null)
  const searchRef           = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
    else setSearch('')
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const lower = search.toLowerCase()
    return items.filter(i => i.label.toLowerCase().includes(lower))
  }, [items, search])

  function handleSelect(item: Item) { onChange(item); setOpen(false) }
  function handleClear(e: React.MouseEvent) { e.stopPropagation(); onChange(null); setOpen(false) }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="input-field w-full h-full text-left flex items-center gap-2"
        style={{ opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer', minHeight: '2.375rem' }}
      >
        <span className="text-sm truncate flex-1" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value ? value.label : placeholder}
        </span>
        {loadingItems && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        {value && !loadingItems && (
          <span onClick={handleClear} style={{ flexShrink: 0, lineHeight: 1 }}>
            <X size={13} style={{ color: 'var(--text-muted)' }} />
          </span>
        )}
        {!value && !loadingItems && (
          <ChevronDown
            size={14}
            style={{ color: 'var(--text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl shadow-xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--d2b-border)', minWidth: '200px' }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}
          >
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (filtered.length === 1) { handleSelect(filtered[0]); onConfirm?.() }
                  else if (value && onConfirm) { setOpen(false); onConfirm() }
                }
              }}
              placeholder="Buscar..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)' }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} style={{ color: 'var(--text-muted)', lineHeight: 1 }}>
                <X size={12} />
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {search ? 'Nenhum resultado.' : 'Nenhum item encontrado.'}
            </div>
          ) : (
            <ul style={{ maxHeight: '13rem', overflowY: 'auto' }}>
              {filtered.map(item => {
                const selected = value?.id === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="w-full text-left px-3 py-2.5 text-sm transition-colors"
                      style={{
                        color: selected ? 'var(--brand)' : 'var(--text-primary)',
                        background: selected ? 'var(--brand-muted)' : 'transparent',
                        fontWeight: selected ? 600 : 400,
                        borderLeft: selected ? '2px solid var(--brand)' : '2px solid transparent',
                      }}
                      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)' }}
                      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 whitespace-nowrap text-[11px] px-2 py-1 pointer-events-none"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--d2b-border)',
            color: 'var(--text-primary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
