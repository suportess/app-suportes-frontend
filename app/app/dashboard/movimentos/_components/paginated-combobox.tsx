'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react'

export type ComboboxItem = { id: number; label: string; data?: unknown }

export type FetchPageFn = (
  page: number,
  pageSize: number,
) => Promise<{ items: ComboboxItem[]; hasMore: boolean }>

type Props = {
  value: ComboboxItem | null
  onChange: (item: ComboboxItem) => void
  placeholder?: string
  disabled?: boolean
  fetchPage: FetchPageFn
  pageSize?: number
  dropdownLabel?: string
}

export function PaginatedCombobox({
  value,
  onChange,
  placeholder = 'Selecione...',
  disabled = false,
  fetchPage,
  pageSize = 15,
  dropdownLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ComboboxItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Reseta quando fetchPage muda (empresa/estoque mudou)
  useEffect(() => {
    setPage(1)
    setItems([])
    setHasMore(false)
    setSearch('')
  }, [fetchPage])

  // Foca o input de busca ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    } else {
      setSearch('')
    }
  }, [open])

  // Busca dados ao abrir ou mudar de página
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchPage(page, pageSize)
      .then(res => {
        if (cancelled) return
        setItems(res.items)
        setHasMore(res.hasMore)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, page, pageSize, fetchPage])

  // Filtra os itens da página atual pelo termo de busca
  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const lower = search.toLowerCase()
    return items.filter(i => i.label.toLowerCase().includes(lower))
  }, [items, search])

  function handleSelect(item: ComboboxItem) {
    onChange(item)
    setOpen(false)
    setPage(1)
    setSearch('')
  }

  function handleToggle() {
    if (disabled) return
    setOpen(o => {
      if (!o) setPage(1)
      return !o
    })
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="input-field w-full text-left"
        style={{
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          justifyContent: 'space-between',
          minHeight: '2.375rem',
        }}
      >
        <span
          className="text-sm truncate flex-1"
          style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          {value ? value.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl shadow-xl overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--d2b-border)',
            minWidth: '200px',
          }}
        >
          {/* Label interno */}
          {dropdownLabel && (
            <div
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider"
              style={{
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--d2b-border)',
                background: 'var(--bg-elevated)',
              }}
            >
              {dropdownLabel}
            </div>
          )}

          {/* Campo de busca */}
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
              placeholder="Buscar…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ color: 'var(--text-muted)', lineHeight: 1 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Carregando…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {search ? 'Nenhum resultado para a busca.' : 'Nenhum item encontrado.'}
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
                      onMouseEnter={e => {
                        if (!selected)
                          (e.currentTarget as HTMLElement).style.background = 'var(--d2b-hover)'
                      }}
                      onMouseLeave={e => {
                        if (!selected)
                          (e.currentTarget as HTMLElement).style.background = 'transparent'
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Paginação — sempre visível */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderTop: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}
          >
            <button
              type="button"
              disabled={page === 1 || loading}
              onClick={() => { setPage(p => p - 1); setSearch('') }}
              className="icon-btn"
              style={{ width: '1.75rem', height: '1.75rem', opacity: page === 1 ? 0.35 : 1 }}
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              página {page}
            </span>
            <button
              type="button"
              disabled={!hasMore || loading}
              onClick={() => { setPage(p => p + 1); setSearch('') }}
              className="icon-btn"
              style={{ width: '1.75rem', height: '1.75rem', opacity: !hasMore ? 0.35 : 1 }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

