'use client'

import { useState, useRef, useCallback, useEffect, useTransition, useId } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  FileSpreadsheet, Upload, X, Loader2, AlertTriangle,
  ChevronRight, ChevronLeft, FileCheck2, Table2, RotateCcw,
  Tags, Check, Package, Trash2, Plus,
} from 'lucide-react'
import { parsearPlanilha, type ParseResult } from '../actions'
import {
  listarEspecies,
  listarClasses,
  listarSubClasses,
} from '../../classificacao/actions'
import type { EmpresaDTO, EspecieMvDTO, ClasseMvDTO, SubClasseMvDTO } from '@/lib/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Etapa = 1 | 2 | 3
type Row = Record<string, string>

export interface ClassificacaoLinha {
  especieTexto:   string
  classeTexto:    string
  subclasseTexto: string
  cdEspecie?:     number
  cdClasse?:      number
  cdSubCla?:      number
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPT = '.xlsx,.xls,.csv'

// ─── Indicador de etapas ──────────────────────────────────────────────────────

const ETAPAS_DEF = [
  { n: 1 as Etapa, label: 'Carregar Arquivo' },
  { n: 2 as Etapa, label: 'Classificação' },
  { n: 3 as Etapa, label: 'Revisão' },
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
                style={{
                  color: active ? 'var(--text-primary)' : done ? 'var(--success)' : 'var(--text-muted)',
                }}
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

// ─── Zona de upload ───────────────────────────────────────────────────────────

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
        background: isDragOver ? 'var(--brand-muted)' : file ? 'var(--success-muted)' : 'var(--surface)',
        cursor: file ? 'default' : 'pointer',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
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
              Suporta .xlsx, .xls e .csv — arquivos grandes são processados no servidor
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

// ─── Preview da tabela virtualizada ──────────────────────────────────────────

function PlanilhaPreview({ headers, rows }: { headers: string[]; rows: Row[] }) {
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const colWidths: Record<string, number> = {
    ds_produto:          340,
    ds_comercial:        220,
    ds_especificacao:    300,
    sn_lote:              80,
    sn_validade:          90,
    sn_medicamento:      110,
    cd_pro_fat:          110,
    cd_pro_fat_sus:      110,
    cd_procedimento_sus: 145,
  }

  const colLabels: Record<string, string> = {
    ds_produto:          'Produto',
    ds_comercial:        'Comercial',
    ds_especificacao:    'Especificação',
    sn_lote:             'Lote',
    sn_validade:         'Validade',
    sn_medicamento:      'Medicamento',
    cd_pro_fat:          'Pro. Fat.',
    cd_pro_fat_sus:      'Pro. Fat. SUS',
    cd_procedimento_sus: 'Procedimento SUS',
  }

  const columns: ColumnDef<Row>[] = headers.map(h => ({
    id: h, accessorKey: h,
    header: colLabels[h] ?? h,
    size: colWidths[h] ?? 180,
  }))

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })
  const { rows: tableRows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 36,
    overscan: 20,
  })

  const virtualItems  = rowVirtualizer.getVirtualItems()
  const totalSize     = rowVirtualizer.getTotalSize()
  const paddingTop    = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0
  const paddingBottom = virtualItems.length > 0
    ? totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0) : 0

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Table2 size={15} style={{ color: 'var(--purple)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Pré-visualização</span>
          <span className="badge badge-muted">{rows.length.toLocaleString('pt-BR')} linhas</span>
          <span className="badge badge-muted">{headers.length} colunas</span>
        </div>
      </div>

      <div ref={tableContainerRef} className="overflow-auto" style={{ maxHeight: 340 }}>
        <table
          className="data-table"
          style={{
            tableLayout: 'fixed',
            width: '100%',
            minWidth: headers.reduce((sum, h) => sum + (colWidths[h] ?? 180), 0),
          }}
        >
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} style={{ width: h.getSize(), minWidth: h.getSize() }}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && <tr><td colSpan={headers.length} style={{ height: paddingTop }} /></tr>}
            {virtualItems.map(vi => {
              const row = tableRows[vi.index]
              return (
                <tr key={row.id} style={{ height: 36 }}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
            {paddingBottom > 0 && <tr><td colSpan={headers.length} style={{ height: paddingBottom }} /></tr>}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        Mostrando {virtualItems.length} de {rows.length.toLocaleString('pt-BR')} linhas visíveis
      </div>
    </div>
  )
}

// ─── Autocomplete com datalist ───────────────────────────────────────────────

function AutocompleteField({
  id, label, value, onChange, options, placeholder, disabled, loading,
}: {
  id: string
  label: string
  value: string
  onChange: (val: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          list={id + '-list'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={loading ? 'Carregando…' : (placeholder ?? 'Digite ou selecione…')}
          disabled={disabled || loading}
          className="input-field w-full"
          autoComplete="off"
        />
        <datalist id={id + '-list'}>
          {options.map(opt => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
        {loading && (
          <Loader2
            size={13}
            className="animate-spin absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Etapa 2: Classificação (autocomplete + tabela) ───────────────────────────

function EtapaClassificacao({
  onConfirm,
  onBack,
}: {
  onConfirm: (linhas: ClassificacaoLinha[]) => void
  onBack: () => void
}) {
  const uid = useId()

  // Listas para os datalists
  const [especies,   setEspecies]   = useState<EspecieMvDTO[]>([])
  const [classes,    setClasses]    = useState<ClasseMvDTO[]>([])
  const [subclasses, setSubclasses] = useState<SubClasseMvDTO[]>([])

  // Valores dos campos (texto livre)
  const [especieVal,   setEspecieVal]   = useState('')
  const [classeVal,    setClasseVal]    = useState('')
  const [subclasseVal, setSubclasseVal] = useState('')

  // IDs resolvidos (quando o valor bate com um registro existente)
  const [cdEspecie, setCdEspecie] = useState<number | undefined>()
  const [cdClasse,  setCdClasse]  = useState<number | undefined>()
  const [cdSubCla,  setCdSubCla]  = useState<number | undefined>()

  // Tabela de combinações adicionadas
  const [linhas, setLinhas] = useState<ClassificacaoLinha[]>([])

  const [loadingEspecies, startEspecies] = useTransition()
  const [loadingClasses,  startClasses]  = useTransition()
  const [loadingSub,      startSub]      = useTransition()

  useEffect(() => {
    startEspecies(async () => {
      const res = await listarEspecies()
      setEspecies(res)
    })
  }, [])

  function handleEspecieChange(val: string) {
    setEspecieVal(val)
    // Reset cascata
    setClasseVal('')
    setSubclasseVal('')
    setCdEspecie(undefined)
    setCdClasse(undefined)
    setCdSubCla(undefined)
    setClasses([])
    setSubclasses([])
    // Tenta resolver ID
    const matched = especies.find(e => e.DS_ESPECIE === val)
    if (matched) {
      setCdEspecie(matched.CD_ESPECIE)
      startClasses(async () => {
        const res = await listarClasses(matched.CD_ESPECIE)
        setClasses(res)
      })
    }
  }

  function handleClasseChange(val: string) {
    setClasseVal(val)
    setSubclasseVal('')
    setCdClasse(undefined)
    setCdSubCla(undefined)
    setSubclasses([])
    const matched = classes.find(c => c.DS_CLASSE === val)
    if (matched && cdEspecie !== undefined) {
      setCdClasse(matched.CD_CLASSE)
      startSub(async () => {
        const res = await listarSubClasses(cdEspecie, matched.CD_CLASSE)
        setSubclasses(res)
      })
    }
  }

  function handleSubclasseChange(val: string) {
    setSubclasseVal(val)
    const matched = subclasses.find(s => s.DS_SUB_CLA === val)
    setCdSubCla(matched?.CD_SUB_CLA)
  }

  const podeIncluir =
    especieVal.trim() !== '' &&
    classeVal.trim() !== '' &&
    subclasseVal.trim() !== ''

  function handleIncluir() {
    if (!podeIncluir) return
    const nova: ClassificacaoLinha = {
      especieTexto:   especieVal.trim(),
      classeTexto:    classeVal.trim(),
      subclasseTexto: subclasseVal.trim(),
      cdEspecie,
      cdClasse,
      cdSubCla,
    }
    // Evita duplicatas
    const jaExiste = linhas.some(
      l =>
        l.especieTexto === nova.especieTexto &&
        l.classeTexto === nova.classeTexto &&
        l.subclasseTexto === nova.subclasseTexto,
    )
    if (jaExiste) return
    setLinhas(prev => [...prev, nova])
    // Limpa campos
    setEspecieVal('')
    setClasseVal('')
    setSubclasseVal('')
    setCdEspecie(undefined)
    setCdClasse(undefined)
    setCdSubCla(undefined)
    setClasses([])
    setSubclasses([])
  }

  function handleRemover(i: number) {
    setLinhas(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="card card-p flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Tags size={16} style={{ color: 'var(--brand)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Informe a espécie, classe e subclasse
        </p>
      </div>

      {/* Campos autocomplete */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AutocompleteField
          id={uid + '-especie'}
          label="Espécie"
          value={especieVal}
          onChange={handleEspecieChange}
          options={especies.map(e => e.DS_ESPECIE)}
          loading={loadingEspecies}
        />
        <AutocompleteField
          id={uid + '-classe'}
          label="Classe"
          value={classeVal}
          onChange={handleClasseChange}
          options={classes.map(c => c.DS_CLASSE)}
          placeholder={!especieVal ? 'Informe a espécie primeiro' : undefined}
          loading={loadingClasses}
        />
        <AutocompleteField
          id={uid + '-subclasse'}
          label="Subclasse"
          value={subclasseVal}
          onChange={handleSubclasseChange}
          options={subclasses.map(s => s.DS_SUB_CLA)}
          placeholder={!classeVal ? 'Informe a classe primeiro' : undefined}
          loading={loadingSub}
        />
      </div>

      {/* Botão Incluir */}
      <div className="flex justify-end">
        <button
          className="btn btn-primary flex items-center gap-1.5"
          disabled={!podeIncluir}
          onClick={handleIncluir}
        >
          <Plus size={14} /> Incluir
        </button>
      </div>

      {/* Tabela de combinações adicionadas */}
      {linhas.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div
            className="flex items-center gap-2 px-4 py-2.5 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <Tags size={13} style={{ color: 'var(--brand)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Classificações selecionadas
            </span>
            <span className="badge badge-brand">{linhas.length}</span>
          </div>
          <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '30%' }} />
              <col />
              <col style={{ width: 48 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Espécie</th>
                <th>Classe</th>
                <th>Subclasse</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i}>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="flex items-center gap-1.5">
                      {l.especieTexto}
                      {l.cdEspecie === undefined && (
                        <span className="badge badge-warning" title="Novo registro">novo</span>
                      )}
                    </span>
                  </td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="flex items-center gap-1.5">
                      {l.classeTexto}
                      {l.cdClasse === undefined && (
                        <span className="badge badge-warning" title="Novo registro">novo</span>
                      )}
                    </span>
                  </td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="flex items-center gap-1.5">
                      {l.subclasseTexto}
                      {l.cdSubCla === undefined && (
                        <span className="badge badge-warning" title="Novo registro">novo</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      onClick={() => handleRemover(i)}
                      title="Remover"
                    >
                      <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button className="btn btn-secondary flex items-center gap-1.5" onClick={onBack}>
          <ChevronLeft size={15} /> Voltar
        </button>
        <button
          className="btn btn-gradient flex items-center gap-1.5"
          disabled={linhas.length === 0}
          onClick={() => onConfirm(linhas)}
        >
          Próxima Etapa <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── Etapa 3: Vínculo (placeholder — será implementado) ──────────────────────

function EtapaVinculo({
  resultado,
  linhas,
  onBack,
}: {
  resultado: Extract<ParseResult, { ok: true }>
  linhas: ClassificacaoLinha[]
  onBack: () => void
}) {
  const { total } = resultado

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo */}
      <div
        className="card card-p flex flex-wrap items-center gap-3"
        style={{ background: 'var(--brand-muted)', borderColor: 'var(--brand-border)' }}
      >
        <Tags size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
        <div className="flex flex-wrap gap-2 flex-1">
          {linhas.map((l, i) => (
            <span key={i} className="badge badge-brand text-xs">
              {l.especieTexto} › {l.classeTexto} › {l.subclasseTexto}
            </span>
          ))}
        </div>
        <span className="badge badge-muted text-xs">
          {total.toLocaleString('pt-BR')} produto{total !== 1 ? 's' : ''} na planilha
        </span>
      </div>

      {/* Placeholder */}
      <div
        className="card card-p flex flex-col items-center justify-center gap-3 py-16"
        style={{ color: 'var(--text-muted)' }}
      >
        <Package size={32} strokeWidth={1.3} />
        <p className="text-sm">Etapa de vínculo — em breve</p>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn btn-secondary flex items-center gap-1.5" onClick={onBack}>
          <ChevronLeft size={15} /> Voltar
        </button>
      </div>
    </div>
  )
}

// ─── View principal ───────────────────────────────────────────────────────────

export function ImportacaoProdutosView({ empresaConf }: { empresaConf: EmpresaDTO }) {
  const [etapa, setEtapa] = useState<Etapa>(1)

  // Etapa 1
  const [file,       setFile]       = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [erro,       setErro]       = useState<string | null>(null)
  const [resultado,  setResultado]  = useState<Extract<ParseResult, { ok: true }> | null>(null)

  // Etapa 2
  const [linhas, setLinhas] = useState<ClassificacaoLinha[]>([])

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

  const handleFile = useCallback((f: File) => {
    if (validarArquivo(f)) setFile(f)
  }, [])

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }, [])
  const handleDragLeave = useCallback(() => setIsDragOver(false), [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleClear = () => {
    setFile(null); setErro(null); setResultado(null); setLinhas([]); setEtapa(1)
  }

  const handleProcessar = async () => {
    if (!file) return
    setLoading(true); setErro(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await parsearPlanilha(fd)
      if (!res.ok) { setErro(res.erro); return }
      setResultado(res)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado ao processar a planilha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Empresa ativa */}
      <div className="card card-p flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--brand-muted)' }}
        >
          <FileSpreadsheet size={16} style={{ color: 'var(--brand)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Empresa destino</p>
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {empresaConf.nmEmpresa}
          </p>
        </div>
      </div>

      {/* Indicador de etapas */}
      <div className="card card-p">
        <StepIndicator etapa={etapa} />
      </div>

      {/* ── Etapa 1: Carregar arquivo (some após processar) ── */}
      {etapa === 1 && !resultado && (
        <div className="card card-p flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            1. Selecione o arquivo
          </p>

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

      {/* Preview do arquivo (etapa 1 após processamento) */}
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

      {/* ── Etapa 2: Classificação ── */}
      {etapa === 2 && (
        <EtapaClassificacao
          onConfirm={sel => { setLinhas(sel); setEtapa(3) }}
          onBack={() => setEtapa(1)}
        />
      )}

      {/* ── Etapa 3: Vínculo ── */}
      {etapa === 3 && resultado && (
        <EtapaVinculo
          resultado={resultado}
          linhas={linhas}
          onBack={() => setEtapa(2)}
        />
      )}
    </div>
  )
}
