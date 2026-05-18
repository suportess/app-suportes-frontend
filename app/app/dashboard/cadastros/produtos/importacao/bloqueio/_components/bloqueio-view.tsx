'use client'

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import {
  Upload, X, Loader2, AlertTriangle, Lock, Unlock,
  CheckCircle2, XCircle, Download, History, Package,
  FileCheck2, ChevronRight, RotateCcw, Check,
  FileSpreadsheet,
} from 'lucide-react'
import { parsearPlanilha } from '../../actions'
import { bloquearProduto } from '../../actions'
import {
  registrarBloqueioLote,
  listarBloqueioLotes,
  type BloqueioLoteDTO,
  type ItemBloqueioResult,
} from '../actions'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Row = Record<string, string>
type Etapa = 1 | 2
type ViewMode = 'novo' | 'historico'

type RowResult =
  | { status: 'pending' }
  | { status: 'running' }
  | { status: 'ok';    acao: 'BLOQUEIO' | 'DESBLOQUEIO' }
  | { status: 'erro';  msg: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getAcao(row: Row): 'BLOQUEIO' | 'DESBLOQUEIO' | '' {
  const v = (row.acao ?? row.ACAO ?? '').toString().trim().toUpperCase()
  if (v === 'BLOQUEIO' || v === 'DESBLOQUEIO') return v
  return ''
}

function getCdProduto(row: Row): number | null {
  const v = row.cd_produto ?? row.CD_PRODUTO ?? ''
  const n = Number(v)
  return v && !isNaN(n) && n > 0 ? n : null
}

// ─── StepIndicator ────────────────────────────────────────────────────────────

const ETAPAS_DEF = [
  { n: 1 as Etapa, label: 'Carregar Arquivo' },
  { n: 2 as Etapa, label: 'Revisão' },
]

function StepIndicator({ etapa }: { etapa: Etapa }) {
  return (
    <div className="flex items-center gap-0">
      {ETAPAS_DEF.map((e, i) => {
        const done    = e.n < etapa
        const active  = e.n === etapa
        const pending = e.n > etapa
        return (
          <div key={e.n} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all"
                style={{
                  background: done ? 'var(--success)' : active ? 'var(--brand)' : 'var(--bg-elevated)',
                  color: done || active ? '#fff' : 'var(--text-muted)',
                  border: pending ? '1px solid var(--d2b-border)' : 'none',
                }}
              >
                {done ? <Check size={13} /> : e.n}
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap"
                style={{ color: active ? 'var(--text-primary)' : done ? 'var(--success)' : 'var(--text-muted)' }}
              >
                {e.label}
              </span>
            </div>
            {i < ETAPAS_DEF.length - 1 && (
              <div
                className="h-px flex-1 mx-3"
                style={{ background: done ? 'var(--success)' : 'var(--d2b-border)', minWidth: 24 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── UploadZone ───────────────────────────────────────────────────────────────

function UploadZone({
  file, isDragOver, onFile, onClear, onDragOver, onDragLeave, onDrop, inputRef,
}: {
  file: File | null
  isDragOver: boolean
  onFile: (f: File) => void
  onClear: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !file && inputRef.current?.click()}
      className="relative rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-4 p-10 select-none"
      style={{
        borderColor: isDragOver ? 'var(--brand)' : file ? 'var(--success)' : 'var(--border)',
        background:  isDragOver ? 'var(--brand-muted)' : file ? 'var(--success-muted)' : 'var(--surface)',
        cursor: file ? 'default' : 'pointer',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      {!file ? (
        <>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--purple-muted)' }}>
            <Upload size={24} style={{ color: 'var(--purple)' }} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {isDragOver ? 'Solte o arquivo aqui' : 'Arraste e solte ou clique para selecionar'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Suporta .xlsx, .xls e .csv · colunas obrigatórias: <strong>cd_produto</strong> e <strong>acao</strong>
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--success-muted)' }}>
            <FileCheck2 size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClear() }}
            className="icon-btn absolute top-3 right-3"
            title="Remover arquivo"
          >
            <X size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        </>
      )}
    </div>
  )
}

// ─── Preview da planilha ──────────────────────────────────────────────────────

function PlanilhaPreview({ rows }: { rows: Row[] }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <FileSpreadsheet size={13} style={{ color: 'var(--purple)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          Prévia da planilha
        </span>
        <span className="badge badge-purple">{rows.length} linha{rows.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: 48 }} />
            <col style={{ width: 130 }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>cd_produto</th>
              <th>acao</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const cdProduto = getCdProduto(row)
              const acao      = getAcao(row)
              return (
                <tr key={i}>
                  <td><span className="badge badge-muted">{i + 1}</span></td>
                  <td>
                    {cdProduto
                      ? <span style={{ fontWeight: 600 }}>{cdProduto}</span>
                      : <span className="badge badge-danger">inválido</span>}
                  </td>
                  <td>
                    {acao === 'BLOQUEIO'    && <span className="badge badge-purple">BLOQUEIO</span>}
                    {acao === 'DESBLOQUEIO' && <span className="badge badge-success">DESBLOQUEIO</span>}
                    {!acao                  && <span className="badge badge-warning">INVÁLIDO</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Histórico ───────────────────────────────────────────────────────────────

function HistoricoBloqueios() {
  const [lotes, setLotes] = useState<BloqueioLoteDTO[]>([])
  const [carregando, startCarregar] = useTransition()

  useEffect(() => {
    startCarregar(async () => {
      const lista = await listarBloqueioLotes()
      setLotes(lista)
    })
  }, [])

  if (carregando) {
    return (
      <div className="card card-p flex items-center justify-center gap-2 py-12">
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--purple)' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando histórico…</span>
      </div>
    )
  }

  if (lotes.length === 0) {
    return (
      <div className="card card-p flex flex-col items-center justify-center gap-2 py-12">
        <Package size={32} style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum bloqueio registrado ainda.</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <History size={13} style={{ color: 'var(--purple)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Sessões anteriores</span>
        <span className="badge badge-purple">{lotes.length}</span>
      </div>
      <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: 64 }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
          <col />
          <col style={{ width: 56 }} />
          <col style={{ width: 56 }} />
          <col style={{ width: 56 }} />
          <col style={{ width: 130 }} />
        </colgroup>
        <thead>
          <tr>
            <th>Nº</th>
            <th>Empresa</th>
            <th>Usuário</th>
            <th>Data / Hora</th>
            <th style={{ textAlign: 'center' }}>Total</th>
            <th style={{ textAlign: 'center' }}>OK</th>
            <th style={{ textAlign: 'center' }}>Erro</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lotes.map(l => (
            <tr key={l.id}>
              <td><span className="badge badge-muted">#{l.id}</span></td>
              <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nm_empresa ?? '—'}</td>
              <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nm_usuario ?? '—'}</td>
              <td><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(l.dt_bloqueio).toLocaleString('pt-BR')}</span></td>
              <td style={{ textAlign: 'center' }}><span className="badge badge-muted">{l.qt_itens}</span></td>
              <td style={{ textAlign: 'center' }}><span className="badge badge-success">{l.qt_sucesso}</span></td>
              <td style={{ textAlign: 'center' }}>
                {l.qt_erro > 0
                  ? <span className="badge badge-danger">{l.qt_erro}</span>
                  : <span className="badge badge-muted">0</span>}
              </td>
              <td>
                <a
                  href={`/api/bloqueio/historico/${l.id}/relatorio`}
                  download
                  className="btn btn-secondary flex items-center gap-1 text-xs whitespace-nowrap"
                  style={{ padding: '3px 8px' }}
                >
                  <Download size={12} /> Relatório
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function BloqueioView() {
  const [viewMode,   setViewMode]   = useState<ViewMode>('novo')
  const [etapa,      setEtapa]      = useState<Etapa>(1)
  const [file,       setFile]       = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [erro,       setErro]       = useState<string | null>(null)
  const [rows,       setRows]       = useState<Row[]>([])
  const [parsed,     setParsed]     = useState(false)
  const [resultados, setResultados] = useState<Record<number, RowResult>>({})
  const [executando, setExecutando] = useState(false)
  const [concluido,  setConcluido]  = useState(false)
  const [cdLote,     setCdLote]     = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // ─── Upload handlers ────────────────────────────────────────────────────────

  const handleFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      setErro('Formato inválido. Use .xlsx, .xls ou .csv')
      return
    }
    setErro(null)
    setFile(f)
  }, [])

  const handleClear = () => {
    setFile(null); setErro(null); setRows([]); setParsed(false)
    setEtapa(1); setResultados({}); setConcluido(false); setCdLote(null)
  }

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }, [])
  const handleDragLeave = useCallback(() => setIsDragOver(false), [])
  const handleDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  // ─── Processar planilha ─────────────────────────────────────────────────────

  const handleProcessar = async () => {
    if (!file) return
    setLoading(true); setErro(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await parsearPlanilha(fd)
      if (!res.ok) { setErro(res.erro); return }
      setRows(res.rows)
      setParsed(true)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado ao processar a planilha.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Executar bloqueios ─────────────────────────────────────────────────────

  const executar = async () => {
    setExecutando(true)
    const novos: Record<number, RowResult> = {}
    rows.forEach((_, i) => { novos[i] = { status: 'pending' } })
    setResultados({ ...novos })

    const itensResult: ItemBloqueioResult[] = []

    for (let i = 0; i < rows.length; i++) {
      const row       = rows[i]
      const acao      = getAcao(row)
      const cdProduto = getCdProduto(row)

      novos[i] = { status: 'running' }
      setResultados({ ...novos })

      if (!acao) {
        const msg = 'Coluna ACAO deve ser BLOQUEIO ou DESBLOQUEIO.'
        novos[i] = { status: 'erro', msg }
        setResultados({ ...novos })
        itensResult.push({ cd_produto: cdProduto ?? 0, acao: 'INVALIDA', sn_sucesso: false, ds_erro: msg })
        continue
      }
      if (!cdProduto) {
        const msg = 'Coluna cd_produto inválida ou ausente.'
        novos[i] = { status: 'erro', msg }
        setResultados({ ...novos })
        itensResult.push({ cd_produto: 0, acao, sn_sucesso: false, ds_erro: msg })
        continue
      }

      const res = await bloquearProduto(cdProduto, acao)
      if (res.ok) {
        novos[i] = { status: 'ok', acao }
        itensResult.push({ cd_produto: cdProduto, acao, sn_sucesso: true, ds_erro: null })
      } else {
        novos[i] = { status: 'erro', msg: res.erro }
        itensResult.push({ cd_produto: cdProduto, acao, sn_sucesso: false, ds_erro: res.erro })
      }
      setResultados({ ...novos })
    }

    const saved = await registrarBloqueioLote(itensResult)
    if (saved.ok) setCdLote(saved.lote.id)

    setExecutando(false)
    setConcluido(true)
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const totalOk   = Object.values(resultados).filter(r => r.status === 'ok').length
  const totalErro = Object.values(resultados).filter(r => r.status === 'erro').length

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">

      {/* Sub-tabs */}
      <div className="card card-p py-2">
        <div className="flex gap-1.5">
          <button
            className={`btn text-xs flex items-center gap-1.5 ${viewMode === 'novo' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('novo')}
          >
            <FileSpreadsheet size={13} /> Novo Bloqueio
          </button>
          <button
            className={`btn text-xs flex items-center gap-1.5 ${viewMode === 'historico' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('historico')}
          >
            <History size={13} /> Histórico
          </button>
        </div>
      </div>

      {viewMode === 'historico' && <HistoricoBloqueios />}

      {viewMode === 'novo' && <>

        {/* Indicador de etapas */}
        <div className="card card-p py-2.5">
          <StepIndicator etapa={etapa} />
        </div>

        {/* Etapa 1: Carregar arquivo */}
        {etapa === 1 && !parsed && (
          <div className="card card-p flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                1. Selecione o arquivo
              </p>
              <a
                href="/api/produtos/modelo?tipo=bloqueio"
                download="modelo_produtos_bloqueio.xlsx"
                className="btn btn-secondary flex items-center gap-1.5 text-xs"
              >
                <Download size={13} /> Baixar Modelo
              </a>
            </div>

            <UploadZone
              file={file}
              isDragOver={isDragOver}
              onFile={handleFile}
              onClear={handleClear}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              inputRef={inputRef}
            />

            {erro && (
              <div className="alert alert-warning">
                <AlertTriangle size={14} />
                <span>{erro}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                className="btn btn-gradient flex items-center gap-1.5"
                disabled={!file || loading}
                onClick={handleProcessar}
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Processando…</>
                  : <><ChevronRight size={15} /> Processar Planilha</>}
              </button>
            </div>
          </div>
        )}

        {/* Etapa 1 pós-processamento: prévia */}
        {etapa === 1 && parsed && (
          <>
            <PlanilhaPreview rows={rows} />
            <div className="flex items-center justify-between">
              <button className="btn btn-secondary flex items-center gap-1.5" onClick={handleClear}>
                <RotateCcw size={13} /> Recomeçar
              </button>
              <button
                className="btn btn-gradient flex items-center gap-1.5"
                onClick={() => setEtapa(2)}
              >
                Próxima Etapa <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}

        {/* Etapa 2: Revisão e execução */}
        {etapa === 2 && parsed && (
          <>
            <div className="card card-p flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file?.name}</span>
                {file && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatBytes(file.size)}</span>}
                <span className="badge badge-purple">{rows.length} linha{rows.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex gap-1.5">
                {!executando && !concluido && (
                  <button className="btn btn-gradient flex items-center gap-1.5" onClick={executar}>
                    <Lock size={14} /> Executar
                  </button>
                )}
                <button
                  className="btn btn-secondary flex items-center gap-1.5"
                  onClick={() => { setEtapa(1); setResultados({}); setConcluido(false); setCdLote(null) }}
                  disabled={executando}
                >
                  <RotateCcw size={13} /> {concluido ? 'Recomeçar' : 'Voltar'}
                </button>
              </div>
            </div>

            {concluido && (
              <div
                className="card card-p flex items-center flex-wrap gap-4"
                style={{
                  borderColor: totalErro === 0 ? 'var(--success-border)' : 'var(--warning-border)',
                  background:  totalErro === 0 ? 'var(--success-muted)' : 'var(--warning-muted)',
                }}
              >
                <CheckCircle2 size={20} style={{ color: totalErro === 0 ? 'var(--success)' : 'var(--warning)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', margin: 0 }}>
                    Execução concluída
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                    {totalOk} item{totalOk !== 1 ? 's' : ''} com sucesso
                    {totalErro > 0 && ` · ${totalErro} com erro`}
                  </p>
                </div>
                {cdLote && (
                  <a
                    href={`/api/bloqueio/historico/${cdLote}/relatorio`}
                    download
                    className="btn btn-primary flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Download size={14} /> Baixar Relatório
                  </a>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {rows.map((row, i) => {
                const res       = resultados[i]
                const acao      = getAcao(row)
                const cdProduto = getCdProduto(row)
                const isBloq    = acao === 'BLOQUEIO'
                const isDesbloq = acao === 'DESBLOQUEIO'

                let borderColor = 'var(--border)'
                let bgColor     = 'var(--surface)'

                if (res?.status === 'ok') {
                  borderColor = isBloq ? 'var(--purple-border)' : 'var(--success-border)'
                  bgColor     = isBloq ? 'var(--purple-muted)'  : 'var(--success-muted)'
                } else if (res?.status === 'erro') {
                  borderColor = 'var(--danger-border)'
                  bgColor     = 'var(--danger-muted)'
                } else if (res?.status === 'running') {
                  bgColor = 'var(--bg-elevated)'
                }

                return (
                  <div
                    key={i}
                    style={{
                      border: `1px solid ${borderColor}`,
                      borderRadius: 8,
                      background: bgColor,
                      padding: '0.5rem 0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 24, textAlign: 'right' }}>
                      {i + 1}
                    </span>

                    {isBloq
                      ? <Lock   size={14} style={{ color: 'var(--purple)', flexShrink: 0 }} />
                      : isDesbloq
                        ? <Unlock size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                        : <AlertTriangle size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    }

                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 70 }}>
                      {cdProduto ?? <span style={{ color: 'var(--danger)', fontWeight: 400 }}>sem código</span>}
                    </span>

                    {acao
                      ? <span className={isBloq ? 'badge badge-purple' : 'badge badge-success'} style={{ fontSize: 11 }}>{acao}</span>
                      : <span className="badge badge-warning" style={{ fontSize: 11 }}>AÇÃO INVÁLIDA</span>
                    }

                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: 12 }}>
                      {!res || res.status === 'pending' ? (
                        <span style={{ color: 'var(--text-muted)' }}>aguardando</span>
                      ) : res.status === 'running' ? (
                        <><Loader2 size={13} className="animate-spin" style={{ color: 'var(--purple)' }} /> processando</>
                      ) : res.status === 'ok' ? (
                        <>
                          <CheckCircle2 size={13} style={{ color: isBloq ? 'var(--purple)' : 'var(--success)' }} />
                          <span style={{ color: isBloq ? 'var(--purple)' : 'var(--success)', fontWeight: 600 }}>
                            {isBloq ? 'Bloqueado' : 'Desbloqueado'}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle size={13} style={{ color: 'var(--danger)' }} />
                          <span style={{ color: 'var(--danger)' }}>{res.msg}</span>
                        </>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

      </>}
    </div>
  )
}
