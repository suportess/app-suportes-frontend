'use client'

import { useState, useRef, useCallback, useEffect, useTransition } from 'react'
import { Loader2, AlertTriangle, ChevronRight, RotateCcw, CheckCircle2, Download, ChevronDown, History, FileSpreadsheet, TrendingUp, XCircle, X, AlertCircle, Clock, ChevronLeft } from 'lucide-react'
import { parsearPlanilhaSaldos, listarHistoricoSaldos, listarItensSessaoSaldos, type ParseResult, type ImportacaoSaldosHistoricoDTO, type ImportacaoDevolucaoItemDTO, type PagedResponse } from '../actions'
import { StepIndicator, type Etapa } from './step-indicator'
import { UploadZone } from './upload-zone'
import { PlanilhaPreview } from './planilha-preview'
import { EtapaRevisao } from './etapa-revisao'
import { VideosTutorialFab } from './videos-tutorial-fab'

export function ImportacaoSaldosView() {
  const [etapa,      setEtapa]      = useState<Etapa>(1)
  const [file,       setFile]       = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [erro,       setErro]       = useState<string | null>(null)
  const [resultado,  setResultado]  = useState<Extract<ParseResult, { ok: true }> | null>(null)
  const [importados, setImportados] = useState<number | null>(null)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [viewMode,   setViewMode]   = useState<'importar' | 'historico'>('importar')
  const modelMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showModelMenu) return
    const handle = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node))
        setShowModelMenu(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showModelMenu])

  const inputRef = useRef<HTMLInputElement>(null)

  const validarArquivo = (f: File): boolean => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      setErro('Formato inválido. Use .xlsx, .xls ou .csv')
      return false
    }
    setErro(null)
    return true
  }

  const handleFile      = useCallback((f: File) => { if (validarArquivo(f)) setFile(f) }, [])
  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }, [])
  const handleDragLeave = useCallback(() => setIsDragOver(false), [])
  const handleDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleClear = () => {
    setFile(null); setErro(null); setResultado(null); setEtapa(1); setImportados(null)
  }

  const handleProcessar = async () => {
    if (!file) return
    setLoading(true); setErro(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await parsearPlanilhaSaldos(fd)
      if (!res.ok) { setErro(res.erro); return }
      setResultado(res)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado ao processar a planilha.')
    } finally {
      setLoading(false)
    }
  }

  // ── Tela de sucesso ──────────────────────────────────────────────────────
  if (importados !== null) {
    return (
      <>
        <div className="card card-p flex flex-col items-center gap-4 py-12 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--success-muted)' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--success)' }} />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Importação concluída!</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              <strong>{importados}</strong> saldo(s) importado(s) com sucesso.
            </p>
          </div>
          <button className="btn btn-secondary flex items-center gap-1.5" onClick={handleClear}>
            <RotateCcw size={13} /> Nova Importação
          </button>
        </div>
        <VideosTutorialFab />
      </>
    )
  }

  // Ao concluir importação, voltar ao modo importar
  const handleImportado = (total: number) => {
    setImportados(total)
    setViewMode('importar')
  }

  return (
    <div className="flex flex-col gap-3">
      <VideosTutorialFab />

      {/* Tabs */}
      <div className="card card-p py-2">
        <div className="flex gap-1.5">
          <button
            className={`btn text-xs flex items-center gap-1.5 ${viewMode === 'importar' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('importar')}
          >
            <FileSpreadsheet size={13} /> Nova Importação
          </button>
          <button
            className={`btn text-xs flex items-center gap-1.5 ${viewMode === 'historico' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('historico')}
          >
            <History size={13} /> Histórico
          </button>
        </div>
      </div>

      {viewMode === 'historico' && <HistoricoSaldos />}

      {viewMode === 'importar' && (
      <>
      {/* Indicador de etapas */}
      <div className="card card-p py-2.5">
        <StepIndicator etapa={etapa} />
      </div>

      {/* ── Etapa 1: Upload ── */}
      {etapa === 1 && !resultado && (
        <div className="card card-p flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              1. Selecione o arquivo
            </p>
            <div style={{ position: 'relative' }} ref={modelMenuRef}>
              <button
                className="btn btn-secondary flex items-center gap-1.5 text-xs"
                onClick={() => setShowModelMenu(v => !v)}
              >
                <Download size={13} /> Baixar Modelo <ChevronDown size={11} />
              </button>
              {showModelMenu && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 50, minWidth: 200, padding: '4px 0' }}>
                  {([
                    { tipo: 'devolucao',     label: 'Modelo Devolução'    },
                    { tipo: 'entrada',       label: 'Modelo Entrada'      },
                    { tipo: 'transferencia', label: 'Modelo Transferência'},
                    { tipo: 'misto',         label: 'Modelo Misto'        },
                  ] as const).map(opt => (
                    <a
                      key={opt.tipo}
                      href={`/api/saldos/modelo?tipo=${opt.tipo}`}
                      download={`modelo_${opt.tipo}.xlsx`}
                      onClick={() => setShowModelMenu(false)}
                      style={{ display: 'block', padding: '8px 16px', fontSize: 13, color: 'var(--text-primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {opt.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
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

      {/* Preview raw (etapa 1 pós-processamento) */}
      {etapa === 1 && resultado && (
        <>
          <PlanilhaPreview headers={resultado.headers} rows={resultado.rows} />
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

      {/* ── Etapa 2: Revisão ── */}
      {etapa === 2 && resultado && (
        <EtapaRevisao
          resultado={resultado}
          onBack={() => setEtapa(1)}
          onImportado={handleImportado}
          onNovaImportacao={handleClear}
        />
      )}
      </>
      )}

    </div>
  )
}

// ─── Histórico de importações ─────────────────────────────────────────────────

function HistoricoSaldos() {
  const [result,     setResult]     = useState<PagedResponse<ImportacaoSaldosHistoricoDTO>>({ dados: [], pagina: 0, tamanhoPagina: 10, total: 0 })
  const [page,       setPage]       = useState(0)
  const [carregando, startCarregar] = useTransition()
  const [detalhe,    setDetalhe]    = useState<{ sessao: ImportacaoSaldosHistoricoDTO; itens: ImportacaoDevolucaoItemDTO[] } | null>(null)
  const [loadingDet, startLoadDet]  = useTransition()

  useEffect(() => {
    startCarregar(async () => setResult(await listarHistoricoSaldos(page)))
  }, [page])

  const handleRowClick = (s: ImportacaoSaldosHistoricoDTO) => {
    startLoadDet(async () => {
      const itens = await listarItensSessaoSaldos(s.id)
      setDetalhe({ sessao: s, itens })
    })
  }

  if (detalhe) {
    return <SessaoDetalheView sessao={detalhe.sessao} itens={detalhe.itens} onBack={() => setDetalhe(null)} />
  }

  const totalPages = Math.ceil(result.total / result.tamanhoPagina) || 1

  if (carregando) {
    return (
      <div className="card card-p flex items-center justify-center gap-2 py-12">
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando historico...</span>
      </div>
    )
  }

  if (result.dados.length === 0) {
    return (
      <div className="card card-p flex flex-col items-center justify-center gap-2 py-12">
        <TrendingUp size={32} style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma importacao registrada ainda.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {loadingDet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#fff' }} />
        </div>
      )}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <History size={13} style={{ color: 'var(--brand)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Importacoes anteriores</span>
          <span className="badge badge-brand">{result.total}</span>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>Pagina {page + 1} de {totalPages}</span>
        </div>
        <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: 64 }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col />
            <col style={{ width: 60 }} />
            <col style={{ width: 60 }} />
            <col style={{ width: 60 }} />
          </colgroup>
          <thead>
            <tr>
              <th>N</th>
              <th>Empresa</th>
              <th>Usuario</th>
              <th>Data / Hora</th>
              <th style={{ textAlign: 'center' }}>Total</th>
              <th style={{ textAlign: 'center' }}>OK</th>
              <th style={{ textAlign: 'center' }}>Erro</th>
            </tr>
          </thead>
          <tbody>
            {result.dados.map(s => (
              <tr key={s.id} onClick={() => handleRowClick(s)} style={{ cursor: 'pointer' }}>
                <td><span className="badge badge-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>#{s.id}</span></td>
                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nm_empresa ?? '—'}</td>
                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nm_usuario ?? '—'}</td>
                <td><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(s.dt_importacao).toLocaleString('pt-BR')}</span></td>
                <td style={{ textAlign: 'center' }}><span className="badge badge-muted">{s.qt_itens}</span></td>
                <td style={{ textAlign: 'center' }}>
                  {s.qt_sucesso > 0 && <span className="badge" style={{ background: '#dcfce7', color: '#166534', fontWeight: 700 }}>{s.qt_sucesso}</span>}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {s.qt_erro > 0 && <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>{s.qt_erro}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
            <button className="btn btn-secondary flex items-center gap-1 text-xs" style={{ padding: '3px 10px' }} disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={13} /> Anterior
            </button>
            <button className="btn btn-secondary flex items-center gap-1 text-xs" style={{ padding: '3px 10px' }} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Proxima <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Detalhe de uma sessão ────────────────────────────────────────────────────

function SessaoDetalheView({
  sessao,
  itens,
  onBack,
}: {
  sessao: ImportacaoSaldosHistoricoDTO
  itens:  ImportacaoDevolucaoItemDTO[]
  onBack: () => void
}) {
  const [modalItem, setModalItem] = useState<ImportacaoDevolucaoItemDTO | null>(null)

  const stColor = (st: string) =>
    st === 'ok' ? '#059669' : st === 'parcial' ? '#d97706' : st === 'ignorado' ? '#6b7280' : '#dc2626'
  const stLabel = (st: string) =>
    st === 'ok' ? 'OK' : st === 'parcial' ? 'Parcial' : st === 'ignorado' ? 'Ign.' : 'Erro'
  const movColor = (m: string | null) =>
    m === 'ENTRADA' ? '#059669' : m === 'DEVOLUCAO' ? '#2563eb' : m === 'TRANSFERENCIA' ? '#7c3aed' : m === 'ITEM_TRANSF' ? '#9333ea' : '#6b7280'
  const movBorderColor = (m: string | null) => {
    if (m === 'ENTRADA')       return '#059669'
    if (m === 'DEVOLUCAO')     return '#2563eb'
    if (m === 'TRANSFERENCIA') return '#7c3aed'
    if (m === 'ITEM_TRANSF')   return '#9333ea'
    return '#e5e7eb'
  }
  const movBg = (m: string | null, erro: boolean) => {
    if (erro) return 'rgba(220,38,38,0.04)'
    if (m === 'ENTRADA')       return 'rgba(5,150,105,0.03)'
    if (m === 'DEVOLUCAO')     return 'rgba(37,99,235,0.03)'
    if (m === 'TRANSFERENCIA') return 'rgba(124,58,237,0.04)'
    if (m === 'ITEM_TRANSF')   return 'rgba(147,51,234,0.03)'
    return undefined
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="card card-p flex items-center gap-3 flex-wrap">
        <button className="btn btn-secondary flex items-center gap-1.5 text-xs" onClick={onBack}>
          <ChevronLeft size={13} /> Historico
        </button>
        <span className="badge badge-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>#{sessao.id}</span>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{sessao.nm_empresa ?? '—'}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{sessao.nm_usuario ?? '—'}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(sessao.dt_importacao).toLocaleString('pt-BR')}</span>
        <div className="ml-auto flex items-center gap-2">
          {sessao.qt_sucesso > 0 && <span className="badge" style={{ background: '#dcfce7', color: '#166534', fontWeight: 700 }}>{sessao.qt_sucesso} ok</span>}
          {sessao.qt_erro    > 0 && <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>{sessao.qt_erro} erro</span>}
          <a
            href={`/api/saldos/relatorio/${sessao.id}`}
            download={`relatorio-saldos-${sessao.id}.xlsx`}
            className="btn btn-secondary flex items-center gap-1.5 text-xs"
            style={{ textDecoration: 'none' }}
          >
            <Download size={13} /> Exportar Excel
          </a>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <CheckCircle2 size={13} style={{ color: 'var(--brand)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Linhas importadas</span>
          <span className="badge badge-brand">{itens.length}</span>
        </div>
        {itens.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Nenhum item registrado para esta sessao.</div>
        ) : (
          <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: 65 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 85 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 32 }} />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th>Estoque</th>
                <th>Fornecedor</th>
                <th>Unidade</th>
                <th style={{ textAlign: 'right' }}>Qt.</th>
                <th>Movimento</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itens.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setModalItem(item)}
                  style={{
                    cursor: 'pointer',
                    background: movBg(item.tp_movimento, item.st_execucao === 'erro'),
                    borderLeft: `3px solid ${movBorderColor(item.tp_movimento)}`,
                  }}
                >
                  <td style={{ color: 'var(--text-muted)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{(item.nr_linha ?? 0) + 1}</td>
                  <td style={{ overflow: 'hidden' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {item.cd_produto}{item.ds_produto ? ` \u2013 ${item.ds_produto}` : ''}
                    </div>
                  </td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{item.ds_estoque ?? item.cd_estoque ?? '—'}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{item.nm_fornecedor ?? item.cd_fornecedor ?? '—'}</td>
                  <td style={{ fontSize: 11 }}>{item.ds_unidade ?? item.cd_unidade ?? '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {item.qt_total_devolvida != null ? String(item.qt_total_devolvida) : String(item.qt_devolvida ?? '—')}
                  </td>
                  <td>
                    <span style={{ fontSize: 10, fontWeight: 700, color: movColor(item.tp_movimento), letterSpacing: '0.03em' }}>
                      {item.tp_movimento ?? '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: stColor(item.st_execucao) }}>{stLabel(item.st_execucao)}</span>
                  </td>
                  <td>
                    <button onClick={e => { e.stopPropagation(); setModalItem(item) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex', alignItems: 'center' }}>
                      {item.st_execucao === 'ok'
                        ? <CheckCircle2 size={13} style={{ color: '#059669' }} />
                        : item.st_execucao === 'erro'
                          ? <XCircle size={13} style={{ color: '#dc2626' }} />
                          : <Clock size={13} style={{ color: '#6b7280' }} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalItem && (() => {
        const item    = modalItem
        const st      = item.st_execucao
        const isEnt   = item.tp_movimento === 'ENTRADA' || item.tp_movimento === 'ITEM_TRANSF'
        const isTransf2 = item.tp_movimento === 'TRANSFERENCIA' || item.tp_movimento === 'ITEM_TRANSF'
        const hColor  = st === 'ok'
          ? (isTransf2 ? '#7c3aed' : isEnt ? '#059669' : '#2563eb')
          : st === 'parcial' ? '#d97706' : st === 'ignorado' ? '#6b7280' : '#dc2626'
        const hLabel  = st === 'ok'
          ? (item.tp_movimento === 'TRANSFERENCIA' ? 'Transferencia concluida' : item.tp_movimento === 'ITEM_TRANSF' ? 'Item de transferencia concluido' : isEnt ? 'Entrada registrada' : 'Devolucao concluida')
          : st === 'parcial' ? 'Devolucao parcial'
          : st === 'ignorado' ? 'Ignorado'
          : (isTransf2 ? 'Erro na transferencia' : isEnt ? 'Erro na entrada' : 'Erro na devolucao')

        let oracle: Record<string, unknown> | null = null
        try { if (item.json_resultado) oracle = JSON.parse(item.json_resultado) } catch { /* noop */ }

        const isTransf  = item.tp_movimento === 'TRANSFERENCIA'
        const devolucoes = !isTransf && oracle && Array.isArray(oracle.devolucoes) ? oracle.devolucoes as Record<string, unknown>[] : []
        const entrada    = !isTransf && oracle && !Array.isArray(oracle.devolucoes) && oracle.cd_ent_pro != null ? oracle : null
        const fase1Devs    = isTransf && oracle && Array.isArray(oracle.fase1_devolucoes) ? oracle.fase1_devolucoes as Record<string, unknown>[] : []
        const fase2Ents    = isTransf && oracle && Array.isArray(oracle.fase2_entradas)   ? oracle.fase2_entradas   as Record<string, unknown>[] : []
        const susVinculos  = isTransf && oracle && Array.isArray(oracle.sus_vinculos)     ? oracle.sus_vinculos     as Record<string, unknown>[] : []
        const qtTotalDevolvida = fase1Devs.reduce((s, d) => s + Number(d.qt_devolvida ?? 0), 0)
        const qtTotalEntrada   = fase2Ents.reduce((s, e) => s + Number(e.qt_entrada   ?? 0), 0)

        return (
          <div onClick={() => setModalItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 10, width: '100%', maxWidth: 660, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: hColor, flexShrink: 0 }}>
                {st === 'ok' ? <CheckCircle2 size={17} style={{ color: '#fff', flexShrink: 0 }} />
                  : st === 'parcial' ? <AlertCircle size={17} style={{ color: '#fff', flexShrink: 0 }} />
                  : st === 'ignorado' ? <Clock size={17} style={{ color: '#fff', flexShrink: 0 }} />
                  : <XCircle size={17} style={{ color: '#fff', flexShrink: 0 }} />}
                <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', flex: 1 }}>{hLabel}</span>
                <button onClick={() => setModalItem(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'flex', padding: 4, lineHeight: 0 }}><X size={16} /></button>
              </div>

              <div style={{ overflow: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, background: '#ffffff', color: '#111827' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 12, background: '#f9fafb', borderRadius: 8, padding: '12px 14px', border: '1px solid #e5e7eb' }}>
                  {[
                    ['Produto',   `${item.cd_produto ?? ''} \u2013 ${item.ds_produto ?? ''}`],
                    ['Estoque',   item.ds_estoque ?? item.cd_estoque ?? '—'],
                    ['Fornecedor', item.nm_fornecedor ?? item.cd_fornecedor ?? '—'],
                    [isEnt ? 'Qt. entrada' : 'Qt. solicitada', String(item.qt_devolvida ?? '—')],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{k}</div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {item.ds_erro && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b' }}>
                    <XCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ lineHeight: 1.5 }}>{item.ds_erro}</span>
                  </div>
                )}

                {st !== 'erro' && st !== 'ignorado' && (
                  isTransf2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ color: '#7c3aed', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Total devolvido</div>
                        <div style={{ fontWeight: 700, color: '#4c1d95', fontSize: 18 }}>{qtTotalDevolvida}</div>
                        <div style={{ color: '#a78bfa', fontSize: 10 }}>{fase1Devs.length} devolução(ões)</div>
                      </div>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ color: '#059669', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Total entrada</div>
                        <div style={{ fontWeight: 700, color: '#065f46', fontSize: 18 }}>{qtTotalEntrada}</div>
                        <div style={{ color: '#6ee7b7', fontSize: 10 }}>{fase2Ents.length} produto(s)</div>
                      </div>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ color: '#166534', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Executado em</div>
                        <div style={{ fontWeight: 700, color: '#14532d', fontSize: 13 }}>{item.dt_execucao ? new Date(item.dt_execucao).toLocaleString('pt-BR') : '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
                      {([
                        [isEnt ? 'Qt. entrada' : 'Qt. devolvida', item.qt_total_devolvida != null ? String(item.qt_total_devolvida) : '—'],
                        item.qt_nao_atendida ? ['Qt. nao atendida', String(item.qt_nao_atendida)] : null,
                        ['Executado em', item.dt_execucao ? new Date(item.dt_execucao).toLocaleString('pt-BR') : '—'],
                      ] as ([string, string] | null)[]).filter(Boolean).map(([k, v], i, arr) => (
                        <div key={k} style={{ flex: 1, padding: '10px 14px', borderRight: i < arr.length - 1 ? '1px solid #bbf7d0' : 'none' }}>
                          <div style={{ color: '#166534', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{k}</div>
                          <div style={{ fontWeight: 700, color: '#14532d', fontSize: 14 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {devolucoes.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Registros Oracle</div>
                    {devolucoes.map((dev, di) => (
                      <div key={di} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ background: '#f3f4f6', padding: '8px 12px', fontSize: 11, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {[['DEV_FOR', 'cd_devolucao'], ['ENT_PRO', 'cd_ent_pro'], ['Forn.', 'cd_fornecedor'], ['Qt.', 'qt_devolvida'], ['Vl.', 'vl_total']]
                            .map(([k, fk]) => (
                              <span key={k} style={{ color: '#374151' }}>
                                <span style={{ color: '#9ca3af' }}>{k}: </span>
                                <strong>{String(dev[fk] ?? '—')}</strong>
                              </span>
                            ))}
                        </div>
                        {Array.isArray(dev.itens) && (dev.itens as Record<string, unknown>[]).length > 0 && (
                          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#f9fafb' }}>{['ITDEV_FOR','Lote','Validade','Qt'].map(h => <th key={h} style={{ padding: '5px 10px', textAlign: h === 'Qt' ? 'right' : 'left', fontWeight: 600, color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {(dev.itens as Record<string, unknown>[]).map((it, ii) => (
                                <tr key={ii} style={{ borderTop: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '5px 10px' }}>{String(it.cd_itdev_for ?? '—')}</td>
                                  <td style={{ padding: '5px 10px' }}>{String(it.cd_lote ?? '—')}</td>
                                  <td style={{ padding: '5px 10px' }}>{String(it.dt_validade ?? '—')}</td>
                                  <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700 }}>{String(it.qt ?? '—')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {entrada && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Registros Oracle</div>
                    <div style={{ border: '1px solid #bbf7d0', borderRadius: 8, background: '#f0fdf4', padding: '10px 14px', fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {([
                        ['ENT_PRO',   entrada.cd_ent_pro],
                        ['ITENT_PRO', entrada.cd_itent_pro],
                        entrada.cd_itlot_ent != null ? ['ITLOT_ENT', entrada.cd_itlot_ent] : null,
                        ['Qt.',       entrada.qt_entrada],
                        ['SN_LOTE',   entrada.sn_lote],
                      ] as ([string, unknown] | null)[]).filter(Boolean).map(([k, v]) => (
                        <span key={String(k)} style={{ color: '#374151' }}>
                          <span style={{ color: '#6b7280' }}>{k as string}: </span>
                          <strong>{String(v)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vínculos SUS */}
                {isTransf2 && susVinculos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {susVinculos.map((v, vi) => (
                      <div key={vi} style={{ border: '1px solid #bae6fd', borderRadius: 8, background: '#f0f9ff', padding: '8px 14px', fontSize: 11, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ color: '#374151' }}>
                          <span style={{ color: '#9ca3af' }}>Produto: </span>
                          <strong>{String(v.cd_produto ?? '—')}</strong>
                        </span>
                        <span style={{ color: '#cbd5e1' }}>→</span>
                        <span style={{ color: '#374151' }}>
                          <span style={{ color: '#9ca3af' }}>Filho: </span>
                          <strong>{String(v.cd_produto_filho ?? '—')}</strong>
                        </span>
                        <span style={{ marginLeft: 'auto', background: '#0369a1', color: '#fff', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {String(v.cd_procedimento_sus ?? '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── TRANSFERENCIA: fase1 devolucoes + fase2 entradas ── */}
                {isTransf2 && fase1Devs.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Fase 1 — Devoluções</div>
                    {fase1Devs.map((dev, di) => (
                      <div key={di} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ background: '#f5f3ff', padding: '8px 12px', fontSize: 11, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {[['DEV_FOR', 'cd_devolucao'], ['Produto', 'cd_produto'], ['Forn.', 'cd_fornecedor'], ['Qt.', 'qt_devolvida']].map(([k, fk]) => (
                            <span key={k} style={{ color: '#374151' }}>
                              <span style={{ color: '#9ca3af' }}>{k}: </span>
                              <strong>{String(dev[fk] ?? '—')}</strong>
                            </span>
                          ))}
                        </div>
                        {Array.isArray(dev.itens) && (dev.itens as Record<string, unknown>[]).length > 0 && (
                          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#f9fafb' }}>{['ITDEV_FOR','Lote','Validade','Qt'].map(h => <th key={h} style={{ padding: '5px 10px', textAlign: h === 'Qt' ? 'right' : 'left', fontWeight: 600, color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {(dev.itens as Record<string, unknown>[]).map((it, ii) => (
                                <tr key={ii} style={{ borderTop: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '5px 10px' }}>{String(it.cd_itdev_for ?? '—')}</td>
                                  <td style={{ padding: '5px 10px' }}>{String(it.cd_lote ?? '—')}</td>
                                  <td style={{ padding: '5px 10px' }}>{String(it.dt_validade ?? '—')}</td>
                                  <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700 }}>{String(it.qt ?? '—')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isTransf2 && fase2Ents.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Fase 2 — Entradas</div>
                    {fase2Ents.map((ent, ei) => (
                      <div key={ei} style={{ border: '1px solid #ddd6fe', borderRadius: 8, marginBottom: 8, background: '#faf5ff', padding: '10px 14px', fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {[['ENT_PRO', 'cd_ent_pro'], ['ITENT_PRO', 'cd_itent_pro'], ['Produto', 'cd_produto'], ['Qt.', 'qt_entrada'], ['SN_LOTE', 'sn_lote']].map(([k, fk]) =>
                          ent[fk] != null ? (
                            <span key={k} style={{ color: '#374151' }}>
                              <span style={{ color: '#9ca3af' }}>{k}: </span>
                              <strong>{String(ent[fk])}</strong>
                            </span>
                          ) : null
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}


