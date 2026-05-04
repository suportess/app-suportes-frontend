'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowUpDown, CheckCircle2, AlertTriangle, ArrowLeftRight, Loader2,
  ChevronLeft, ChevronRight, Plus, ArrowRight,
} from 'lucide-react'
import type { EmpresaDTO, TransferenciaConsignadoDTO } from '@/lib/types'
import { listarTransferencias, concluirTransferencia } from '../actions'
import { TransferenciaForm } from './transferencia-form'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

function formatDt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const [y, m, d] = value.substring(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
}

// ─── Componente de campo somente-leitura ─────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

// ─── Tela de detalhe / conclusão ─────────────────────────────────────────────

function TransferenciaDetalhe({
  t,
  empresaId,
  onVoltar,
  onConcluido,
}: {
  t: TransferenciaConsignadoDTO
  empresaId: number
  onVoltar: () => void
  onConcluido: () => void
}) {
  const [concluindo, setConcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const jaConcluida = t.status === 'CONCLUIDO' || sucesso

  async function handleConfirmar() {
    setShowConfirm(false)
    setErro(null)
    setConcluindo(true)
    try {
      await concluirTransferencia(empresaId, t.id)
      setSucesso(true)
      setTimeout(() => onConcluido(), 1200)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao concluir transferência.')
    } finally {
      setConcluindo(false)
    }
  }

  return (
    <div className="card">
      {/* Modal confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="card max-w-sm w-full mx-4" style={{ border: '1px solid var(--d2b-border)' }}>
            <div className="card-p flex flex-col gap-4">
              <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Confirmar transferência?</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Ao confirmar, a devolução ao fornecedor e a nova entrada serão registradas no sistema MV.
                Esta operação não pode ser desfeita.
              </p>
              <div className="flex gap-3 justify-end">
                <button className="btn" onClick={() => setShowConfirm(false)}>Cancelar</button>
                <button className="btn btn-gradient" onClick={handleConfirmar}>Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card-p flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="section-label">
              <ArrowUpDown size={12} />
              <span>Transferência #{t.id}</span>
            </div>
            {jaConcluida
              ? <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ color: 'var(--success)', background: 'color-mix(in srgb, var(--success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)' }}><CheckCircle2 size={12} /> Concluída</span>
              : <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ color: 'var(--warning)', background: 'color-mix(in srgb, var(--warning) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)' }}><AlertTriangle size={12} /> Pendente</span>
            }
          </div>
          <button className="btn" style={{ opacity: 0.7 }} onClick={onVoltar}>
            <ChevronLeft size={14} /> Voltar
          </button>
        </div>

        {/* Alertas */}
        {sucesso && (
          <div className="alert alert-success"><CheckCircle2 size={14} /><span>Transferência concluída com sucesso!</span></div>
        )}
        {erro && (
          <div className="alert alert-danger"><AlertTriangle size={14} /><span>{erro}</span></div>
        )}

        {/* Devolução */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Devolução (Saída)</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoField label="Cód. Multi-empresa" value={String(t.cdMultiEmpresa)} />
            <InfoField label="Estoque" value={t.dsEstoque ?? String(t.cdEstoque)} />
            <InfoField label="Cód. Produto" value={String(t.cdProdutoDev)} />
            <InfoField label="Produto" value={t.dsProdutoDev ?? '-'} />
            <InfoField label="Cód. Entrada" value={String(t.cdEntPro)} />
            {t.cdLoteDev && <InfoField label="Lote" value={t.cdLoteDev} />}
            {t.dtValidadeDev && <InfoField label="Validade" value={formatDate(t.dtValidadeDev)} />}
            <InfoField label="Quantidade" value={String(t.qtDevolvida)} />
            <InfoField label="Data Devolução" value={formatDate(t.dtDevolucao)} />
          </div>
        </div>

        {/* Entrada destino */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid var(--info-border)', background: 'var(--info-muted)' }}>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Nova Entrada (Produto Destino)</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoField label="Cód. Produto" value={String(t.cdProdutoEnt)} />
            <InfoField label="Produto" value={t.dsProdutoEnt ?? '-'} />
            {t.cdLoteEnt && <InfoField label="Lote" value={t.cdLoteEnt} />}
            {t.dtValidadeEnt && <InfoField label="Validade" value={formatDate(t.dtValidadeEnt)} />}
            <InfoField label="Quantidade" value={String(t.qtEntrada)} />
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Criado em {formatDt(t.dtCriacao)}
            {t.dtConclusao && ` · Concluído em ${formatDt(t.dtConclusao)}`}
          </span>
          <button
            className="btn btn-gradient"
            disabled={jaConcluida || concluindo}
            onClick={() => setShowConfirm(true)}
            title={jaConcluida ? 'Transferência já concluída' : undefined}
          >
            {concluindo
              ? <><Loader2 size={14} className="animate-spin" /> Registrando...</>
              : jaConcluida
                ? <><CheckCircle2 size={14} /> Concluída</>
                : 'Concluir'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

type View = 'list' | 'form' | 'detail'

type Props = { empresaConf: EmpresaDTO }

export function MovimentosView({ empresaConf }: Props) {
  const empresaId = empresaConf.id

  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<TransferenciaConsignadoDTO | null>(null)

  // lista
  const [historico, setHistorico] = useState<TransferenciaConsignadoDTO[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [erroLista, setErroLista] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const carregar = useCallback(async (p: number) => {
    setLoading(true)
    setErroLista(null)
    try {
      const res = await listarTransferencias(empresaId, p, PAGE_SIZE)
      setHistorico(res.dados ?? [])
      setTotal(res.total ?? 0)
    } catch (e) {
      setErroLista(e instanceof Error ? e.message : 'Erro ao carregar transferências.')
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  useEffect(() => {
    if (view === 'list') carregar(page)
  }, [view, page, carregar])

  function abrirDetalhe(t: TransferenciaConsignadoDTO) {
    setSelected(t)
    setView('detail')
  }

  function voltarParaLista() {
    setSelected(null)
    setView('list')
    carregar(page)
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  if (view === 'form') {
    return (
      <TransferenciaForm
        empresaConf={empresaConf}
        onVoltar={() => setView('list')}
        onConcluido={voltarParaLista}
      />
    )
  }

  if (view === 'detail' && selected) {
    return (
      <TransferenciaDetalhe
        t={selected}
        empresaId={empresaId}
        onVoltar={voltarParaLista}
        onConcluido={voltarParaLista}
      />
    )
  }

  // ── Lista (default) ───────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-muted)' }}>
              <ArrowLeftRight size={17} style={{ color: 'var(--brand)' }} />
            </div>
            Transferências Consignadas
          </h1>
          <p className="page-subtitle">Histórico e gestão de transferências de saldo entre produtos</p>
        </div>
        <button className="btn btn-gradient" onClick={() => setView('form')}>
          <Plus size={14} />
          Nova Transferência
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
            <span className="text-sm">Carregando transferências...</span>
          </div>
        </div>
      ) : historico.length > 0 ? (
        <>
          <div className="flex flex-col gap-2">
            {historico.map(t => (
            <button
              key={t.id}
              className="card w-full text-left overflow-hidden"
              style={{ cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onClick={() => abrirDetalhe(t)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = 'var(--shadow-brand)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <div className="flex">
                {/* Barra de status lateral */}
                <div
                  className="w-1 flex-shrink-0 self-stretch"
                  style={{ background: t.status === 'CONCLUIDO' ? 'var(--success)' : 'var(--warning)' }}
                />

                <div className="flex-1 min-w-0 px-4 py-3.5 flex items-center gap-4">
                  {/* Conteúdo principal */}
                  <div className="flex-1 min-w-0">

                    {/* Linha 1: ID + data */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--d2b-border)' }}
                      >
                        #{String(t.id).padStart(4, '0')}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDt(t.dtCriacao)}
                      </span>
                    </div>

                    {/* Linha 2: Fluxo De → Para */}
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>De</div>
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', maxWidth: '13rem' }}>
                          {t.dsProdutoDev ?? `Cód. ${t.cdProdutoDev}`}
                        </div>
                      </div>
                      <ArrowRight size={14} className="flex-shrink-0" style={{ color: 'var(--brand)' }} />
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Para</div>
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', maxWidth: '13rem' }}>
                          {t.dsProdutoEnt ?? `Cód. ${t.cdProdutoEnt}`}
                        </div>
                      </div>
                    </div>

                    {/* Linha 3: Estoque + quantidade */}
                    <div className="mt-1.5 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t.dsEstoque && <span>{t.dsEstoque}</span>}
                      {t.dsEstoque && <span>·</span>}
                      <span>{t.qtDevolvida} unid.</span>
                    </div>
                  </div>

                  {/* Direita: badge + chevron */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full hidden sm:inline-flex items-center gap-1"
                      style={{
                        color: t.status === 'CONCLUIDO' ? 'var(--success)' : 'var(--warning)',
                        background: t.status === 'CONCLUIDO'
                          ? 'color-mix(in srgb, var(--success) 12%, transparent)'
                          : 'color-mix(in srgb, var(--warning) 12%, transparent)',
                        border: t.status === 'CONCLUIDO'
                          ? '1px solid color-mix(in srgb, var(--success) 25%, transparent)'
                          : '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
                      }}
                    >
                      {t.status === 'CONCLUIDO'
                        ? <><CheckCircle2 size={11} /> Concluída</>
                        : <><AlertTriangle size={11} /> Pendente</>
                      }
                    </span>
                    <ChevronRight size={15} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </div>
            </button>
          ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} {total === 1 ? 'registro' : 'registros'}</span>
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
            <ArrowUpDown size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">
              Nenhuma transferência registrada.
            </p>
            <button className="btn btn-gradient" onClick={() => setView('form')}>
              <Plus size={14} /> Nova Transferência
            </button>
          </div>
        </div>
      )}
    </>
  )
}

