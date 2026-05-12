'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package, AlertTriangle, Loader2, Plus,
  ChevronLeft, ChevronRight, CheckCircle2,
} from 'lucide-react'
import type { EmpresaDTO, OperacaoBaixaConsignadoDTO } from '@/lib/types'
import { listarOperacoesBaixa } from '../../actions'
import { SaldoConsignadosView } from './saldo-consignados-view'
import { OperacaoDetalheView } from './sc-operacao-detalhe-view'

const PAGE_SIZE = 20

function formatDt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

type View = 'list' | 'form' | 'detail'

export function SaldoConsignadosListaView({ empresaConf }: { empresaConf: EmpresaDTO }) {
  const empresaId = empresaConf.id

  const [view, setView]       = useState<View>('list')
  const [selected, setSelected] = useState<OperacaoBaixaConsignadoDTO | null>(null)
  const [editandoOperacao, setEditandoOperacao] = useState<OperacaoBaixaConsignadoDTO | null>(null)

  const [historico, setHistorico]   = useState<OperacaoBaixaConsignadoDTO[]>([])
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(false)
  const [erroLista, setErroLista]   = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const carregar = useCallback(async (p: number) => {
    setLoading(true)
    setErroLista(null)
    try {
      const res = await listarOperacoesBaixa(empresaId, p, PAGE_SIZE)
      setHistorico(res.dados ?? [])
      setTotal(res.total ?? 0)
    } catch (e) {
      setErroLista(e instanceof Error ? e.message : 'Erro ao carregar operações.')
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  useEffect(() => {
    if (view === 'list') carregar(page)
  }, [view, page, carregar])

  function abrirDetalhe(op: OperacaoBaixaConsignadoDTO) {
    setSelected(op)
    setView('detail')
  }

  function voltarParaLista() {
    setSelected(null)
    setEditandoOperacao(null)
    setView('list')
  }

  // ── Nova operação (formulário multi-etapas) ───────────────────────────────

  if (view === 'form') {
    return (
      <SaldoConsignadosView
        empresaConf={empresaConf}
        initialOperacao={editandoOperacao ?? undefined}
        onConcluir={voltarParaLista}
      />
    )
  }

  // ── Detalhe de operação salva ─────────────────────────────────────────────

  if (view === 'detail' && selected) {
    return (
      <OperacaoDetalheView
        operacao={selected}
        onVoltar={voltarParaLista}
        onExcluido={voltarParaLista}
        onEditar={() => { setEditandoOperacao(selected); setView('form') }}
      />
    )
  }

  // ── Lista (default) ───────────────────────────────────────────────────────

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {loading ? 'Carregando...' : `${total} operaç${total === 1 ? 'ão' : 'ões'} registrada${total === 1 ? '' : 's'}`}
        </span>
        <button className="btn btn-gradient flex items-center gap-1.5" onClick={() => setView('form')}>
          <Plus size={14} />
          Nova Operação
        </button>
      </div>

      {erroLista && (
        <div className="alert alert-danger">
          <AlertTriangle size={14} />
          <span>{erroLista}</span>
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="card-p flex items-center justify-center py-12 gap-2" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Carregando operações...</span>
          </div>
        </div>
      ) : historico.length > 0 ? (
        <>
          <div className="flex flex-col gap-2">
            {historico.map(op => {
              const saldoAlocado = op.itens.reduce(
                (acc, item) => acc + item.linhas.reduce((s, l) => s + (l.quantidade ?? 0), 0),
                0,
              )
              const jaConcluida = op.status === 'CONCLUIDO'

              return (
                <button
                  key={op.id}
                  className="card w-full text-left overflow-hidden"
                  style={{ cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  onClick={() => abrirDetalhe(op)}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--brand)'
                    e.currentTarget.style.boxShadow   = 'var(--shadow-brand)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = ''
                    e.currentTarget.style.boxShadow   = ''
                  }}
                >
                  <div className="flex">
                    {/* Barra de status lateral */}
                    <div
                      className="w-1 flex-shrink-0 self-stretch"
                      style={{ background: jaConcluida ? 'var(--success)' : 'var(--warning)' }}
                    />

                    <div className="flex-1 min-w-0 px-4 py-3.5 flex items-center gap-4">
                      <div className="flex-1 min-w-0">

                        {/* Linha 1: ID + data */}
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--d2b-border)' }}
                          >
                            #{String(op.id).padStart(4, '0')}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatDt(op.dtCriacao)}
                          </span>
                        </div>

                        {/* Linha 2: Estoque + produtos */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {op.dsEstoque ?? `Cód. ${op.cdEstoque}`}
                          </span>
                          {op.origens.length > 0 && (
                            <>
                              <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {op.origens.map(o => o.dsProduto ?? `Cód. ${o.cdProduto}`).join(', ')}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Linha 3: contadores */}
                        <div className="mt-1.5 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>{op.itens.length} produto{op.itens.length !== 1 ? 's' : ''} destino</span>
                          <span>·</span>
                          <span className="font-mono font-medium" style={{ color: 'var(--brand)' }}>
                            {saldoAlocado.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })} unid.
                          </span>
                        </div>

                      </div>

                      {/* Direita: badge + chevron */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full hidden sm:inline-flex items-center gap-1"
                          style={{
                            color: jaConcluida ? 'var(--success)' : 'var(--warning)',
                            background: jaConcluida
                              ? 'color-mix(in srgb, var(--success) 12%, transparent)'
                              : 'color-mix(in srgb, var(--warning) 12%, transparent)',
                            border: jaConcluida
                              ? '1px solid color-mix(in srgb, var(--success) 25%, transparent)'
                              : '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
                          }}
                        >
                          {jaConcluida
                            ? <><CheckCircle2 size={11} /> Concluída</>
                            : <><AlertTriangle size={11} /> Pendente</>
                          }
                        </span>
                        <ChevronRight size={15} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {total} {total === 1 ? 'registro' : 'registros'}
              </span>
              <div className="flex items-center gap-2">
                <button className="icon-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)} title="Página anterior">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
                <button className="icon-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} title="Próxima página">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <div className="card-p flex flex-col items-center py-12 gap-3">
            <Package size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">
              Nenhuma operação registrada.
            </p>
            <button className="btn btn-gradient flex items-center gap-1.5" onClick={() => setView('form')}>
              <Plus size={14} /> Nova Operação
            </button>
          </div>
        </div>
      )}
    </>
  )
}
