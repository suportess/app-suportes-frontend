'use client'

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import {
  Upload, X, Loader2, AlertTriangle, Link2,
  CheckCircle2, XCircle, Download, History, Package,
  FileCheck2, ChevronRight, RotateCcw, Check,
  FileSpreadsheet,
} from 'lucide-react'
import { parsearPlanilha } from '../../actions'
import {
  vincularSusProduto,
  listarVinculos,
  type VinculoInput,
  type VinculoResultItem,
  type VinculoSessaoDTO,
} from '../actions'

// â”€â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Row = Record<string, string>
type Etapa = 1 | 2
type ViewMode = 'novo' | 'historico'

type RowResult =
  | { status: 'pending' }
  | { status: 'running' }
  | { status: 'ok';   item: VinculoResultItem; sessaoId: number }
  | { status: 'erro'; msg: string }

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getCd(row: Row, key: string): number | null {
  const v = row[key] ?? row[key.toUpperCase()] ?? ''
  const n = Number(v)
  return v && !isNaN(n) && n > 0 ? n : null
}

// â”€â”€â”€ StepIndicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ UploadZone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              Suporta .xlsx, .xls e .csv · colunas obrigatórias: <strong>cd_produto_antigo</strong> e <strong>cd_produto_novo</strong>
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

// â”€â”€â”€ PrÃ©via da planilha â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            <col style={{ width: 140 }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>cd_produto_antigo (antigo)</th>
              <th>cd_produto_novo (novo)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const cdAntigo = getCd(row, 'cd_produto_antigo')
              const cdNovo   = getCd(row, 'cd_produto_novo')
              return (
                <tr key={i}>
                  <td><span className="badge badge-muted">{i + 1}</span></td>
                  <td>
                    {cdAntigo
                      ? <span style={{ fontWeight: 600 }}>{cdAntigo}</span>
                      : <span className="badge badge-danger">inválido</span>}
                  </td>
                  <td>
                    {cdNovo
                      ? <span style={{ fontWeight: 600 }}>{cdNovo}</span>
                      : <span className="badge badge-danger">inválido</span>}
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

// â”€â”€â”€ Resultado da execuÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResultadoTable({ vinculos }: { vinculos: VinculoResultItem[] }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          Resultado
        </span>
        <span className="badge badge-success">{vinculos.length} vínculo{vinculos.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: 90 }} />
            <col />
            <col style={{ width: 90 }} />
            <col />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Cód. Antigo</th>
              <th>Produto Antigo</th>
              <th>Cód. Novo</th>
              <th>Produto Novo</th>
              <th style={{ textAlign: 'center' }}>SUS</th>
            </tr>
          </thead>
          <tbody>
            {vinculos.map((v, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{v.cd_produto_antigo}</td>
                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{v.ds_produto_antigo}</td>
                <td style={{ fontWeight: 600 }}>{v.cd_produto_novo}</td>
                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{v.ds_produto_novo}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className="badge badge-success" style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                    {v.cd_procedimento_sus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// â”€â”€â”€ HistÃ³rico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function HistoricoVinculos() {
  const [sessoes, setSessoes] = useState<VinculoSessaoDTO[]>([])
  const [carregando, startCarregar] = useTransition()

  useEffect(() => {
    startCarregar(async () => {
      const lista = await listarVinculos()
      setSessoes(lista)
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

  if (sessoes.length === 0) {
    return (
      <div className="card card-p flex flex-col items-center justify-center gap-2 py-12">
        <Package size={32} style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum vínculo SUS registrado ainda.</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <History size={13} style={{ color: 'var(--purple)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Sessões anteriores</span>
        <span className="badge badge-purple">{sessoes.length}</span>
      </div>
      <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: 64 }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
          <col />
          <col style={{ width: 72 }} />
        </colgroup>
        <thead>
          <tr>
            <th>Nº</th>
            <th>Empresa</th>
            <th>Usuário</th>
            <th>Data / Hora</th>
            <th style={{ textAlign: 'center' }}>Vínculos</th>
          </tr>
        </thead>
        <tbody>
          {sessoes.map(s => (
            <tr key={s.id}>
              <td><span className="badge badge-muted">#{s.id}</span></td>
              <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nmEmpresa ?? '—'}</td>
              <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nmUsuario ?? '—'}</td>
              <td><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(s.dtVinculo).toLocaleString('pt-BR')}</span></td>
              <td style={{ textAlign: 'center' }}><span className="badge badge-success">{s.qtVinculos}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// â”€â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function VinculoSusView() {
  const [viewMode,   setViewMode]   = useState<ViewMode>('novo')
  const [etapa,      setEtapa]      = useState<Etapa>(1)
  const [file,       setFile]       = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [erro,       setErro]       = useState<string | null>(null)
  const [rows,       setRows]       = useState<Row[]>([])
  const [parsed,     setParsed]     = useState(false)
  const [executando,     setExecutando]     = useState(false)
  const [concluido,      setConcluido]      = useState(false)
  const [resultados,     setResultados]     = useState<Record<number, RowResult>>({})
  const [detalhesAberto, setDetalhesAberto] = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // â”€â”€â”€ Upload handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    setEtapa(1); setConcluido(false); setResultados({}); setDetalhesAberto(null)
  }

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }, [])
  const handleDragLeave = useCallback(() => setIsDragOver(false), [])
  const handleDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  // â”€â”€â”€ Processar planilha â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleProcessar = async () => {
    if (!file) return
    setLoading(true); setErro(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await parsearPlanilha(fd)
      if (!res.ok) { setErro(res.erro); return }

      // Valida colunas obrigatÃ³rias
      const invalidos = res.rows.filter(r => !getCd(r, 'cd_produto_antigo') || !getCd(r, 'cd_produto_novo'))
      if (invalidos.length > 0) {
        setErro(`${invalidos.length} linha(s) com cd_produto_antigo ou cd_produto_novo inválidos ou ausentes.`)
        return
      }

      setRows(res.rows)
      setParsed(true)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado ao processar a planilha.')
    } finally {
      setLoading(false)
    }
  }

  // â”€â”€â”€ Executar vÃ­nculo em lote â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const executar = async () => {
    setExecutando(true); setErro(null)
    const novos: Record<number, RowResult> = {}
    rows.forEach((_, i) => { novos[i] = { status: 'pending' } })
    setResultados({ ...novos })

    for (let i = 0; i < rows.length; i++) {
      const cdAntigo = getCd(rows[i], 'cd_produto_antigo')!
      const cdNovo   = getCd(rows[i], 'cd_produto_novo')!

      novos[i] = { status: 'running' }
      setResultados({ ...novos })

      const res = await vincularSusProduto([{ cdProdutoAntigo: cdAntigo, cdProdutoNovo: cdNovo }])
      if (res.ok) {
        novos[i] = { status: 'ok', item: res.vinculos[0], sessaoId: res.sessaoId }
      } else {
        novos[i] = { status: 'erro', msg: res.erro }
      }
      setResultados({ ...novos })
    }

    setExecutando(false)
    setConcluido(true)
  }

  const totalOk   = Object.values(resultados).filter(r => r.status === 'ok').length
  const totalErro = Object.values(resultados).filter(r => r.status === 'erro').length

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="flex flex-col gap-3">

      {/* Sub-tabs */}
      <div className="card card-p py-2">
        <div className="flex gap-1.5">
          <button
            className={`btn text-xs flex items-center gap-1.5 ${viewMode === 'novo' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('novo')}
          >
            <FileSpreadsheet size={13} /> Novo Vínculo
          </button>
          <button
            className={`btn text-xs flex items-center gap-1.5 ${viewMode === 'historico' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('historico')}
          >
            <History size={13} /> Histórico
          </button>
        </div>
      </div>

      {viewMode === 'historico' && <HistoricoVinculos />}

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
                href="/api/produtos/modelo?tipo=vinculo"
                download="modelo_vinculo_sus.xlsx"
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
                    <Link2 size={14} /> Executar
                  </button>
                )}
                <button
                  className="btn btn-secondary flex items-center gap-1.5"
                  onClick={() => { setEtapa(1); setConcluido(false); setResultados({}); setDetalhesAberto(null); setErro(null) }}
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
                    {totalOk} vínculo{totalOk !== 1 ? 's' : ''} aplicado{totalOk !== 1 ? 's' : ''} com sucesso
                    {totalErro > 0 && ` · ${totalErro} com erro`}
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {rows.map((row, i) => {
                const res      = resultados[i]
                const cdAntigo = getCd(row, 'cd_produto_antigo')
                const cdNovo   = getCd(row, 'cd_produto_novo')
                const isOpen   = detalhesAberto === i

                let borderColor = 'var(--border)'
                let bgColor     = 'var(--surface)'
                if (res?.status === 'ok')         { borderColor = 'var(--success-border)'; bgColor = 'var(--success-muted)' }
                else if (res?.status === 'erro')  { borderColor = 'var(--danger-border)';  bgColor = 'var(--danger-muted)'  }
                else if (res?.status === 'running') { bgColor = 'var(--bg-elevated)' }

                return (
                  <div key={i}>
                    <div style={{
                      border: `1px solid ${borderColor}`,
                      borderRadius: isOpen ? '8px 8px 0 0' : 8,
                      background: bgColor,
                      padding: '0.5rem 0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.2s',
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 24, textAlign: 'right' }}>
                        {i + 1}
                      </span>
                      <Link2 size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 56 }}>
                        {cdAntigo ?? <span style={{ color: 'var(--danger)', fontWeight: 400 }}>inválido</span>}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 56 }}>
                        {cdNovo ?? <span style={{ color: 'var(--danger)', fontWeight: 400 }}>inválido</span>}
                      </span>
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {!res || res.status === 'pending' ? (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>aguardando</span>
                        ) : res.status === 'running' ? (
                          <>
                            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--brand)' }} />
                            <span style={{ fontSize: 12, color: 'var(--brand)' }}>processando</span>
                          </>
                        ) : res.status === 'ok' ? (
                          <button
                            style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700, background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                            onClick={() => setDetalhesAberto(isOpen ? null : i)}
                          >
                            <CheckCircle2 size={12} /> SUS aplicado
                          </button>
                        ) : (
                          <button
                            style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                            onClick={() => setDetalhesAberto(isOpen ? null : i)}
                          >
                            <XCircle size={12} /> Erro
                          </button>
                        )}
                      </span>
                    </div>
                    {isOpen && res && (res.status === 'ok' || res.status === 'erro') && (
                      <div style={{
                        border: `1px solid ${borderColor}`,
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        background: 'var(--surface)',
                        padding: '0.625rem 0.875rem 0.625rem 3.5rem',
                        fontSize: 12,
                      }}>
                        {res.status === 'ok' ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <span>
                              <span style={{ color: 'var(--text-muted)' }}>Produto antigo: </span>
                              <strong>{res.item.ds_produto_antigo}</strong>
                            </span>
                            <span>
                              <span style={{ color: 'var(--text-muted)' }}>Produto novo: </span>
                              <strong>{res.item.ds_produto_novo}</strong>
                            </span>
                            <span>
                              <span style={{ color: 'var(--text-muted)' }}>Código SUS: </span>
                              <strong style={{ fontFamily: 'monospace' }}>{res.item.cd_procedimento_sus}</strong>
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--danger)' }}>{res.msg}</span>
                        )}
                      </div>
                    )}
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
