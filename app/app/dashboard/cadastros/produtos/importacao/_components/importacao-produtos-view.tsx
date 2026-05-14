'use client'

import { useState, useRef, useCallback, useEffect, useTransition, useId, useMemo } from 'react'
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
  Tags, Check, Package, Trash2, Plus, Ruler, Search,
  CheckCircle2, XCircle,
} from 'lucide-react'
import {
  parsearPlanilha, type ParseResult,
  cadastrarProduto, type CadastroProdutoPayload, type CadastroResult,
} from '../actions'
import {
  listarEspecies,
  listarClasses,
  listarSubClasses,
  listarUnidades,
} from '../../classificacao/actions'
import type { EmpresaDTO, EspecieMvDTO, ClasseMvDTO, SubClasseMvDTO, UnidadeMvDTO } from '@/lib/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Etapa = 1 | 2
type Row = Record<string, string>

export interface ClassificacaoLinha {
  especieTexto:   string
  classeTexto:    string
  subclasseTexto: string
  cdEspecie?:     number
  cdClasse?:      number
  cdSubCla?:      number
  cdUnidade?:     string
  dsUnidade?:     string
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

      {linhas.length === 0 && (
        <div className="alert alert-warning">
          <AlertTriangle size={14} />
          <span>Adicione ao menos uma classificação (espécie, classe e subclasse) para prosseguir.</span>
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

// ─── Etapa 3: Unidade ───────────────────────────────────────────────────────

function EtapaUnidade({
  linhas,
  onConfirm,
  onBack,
}: {
  linhas: ClassificacaoLinha[]
  onConfirm: (linhasComUnidade: ClassificacaoLinha[]) => void
  onBack: () => void
}) {
  const uid = useId()

  const [unidadesList,    setUnidadesList]    = useState<UnidadeMvDTO[]>([])
  const [loadingUnidades, startUnidades]      = useTransition()
  const [unidades,        setUnidades]        = useState<Record<number, string>>(
    () => Object.fromEntries(linhas.map((l, i) => [i, l.dsUnidade ?? '']))
  )

  useEffect(() => {
    startUnidades(async () => {
      const res = await listarUnidades()
      setUnidadesList(res)
    })
  }, [])

  const todosPreenchidos = linhas.every((_, i) => (unidades[i] ?? '').trim() !== '')

  function handleConfirm() {
    if (!todosPreenchidos) return
    const updated = linhas.map((l, i) => {
      const input   = (unidades[i] ?? '').trim()
      const matched = unidadesList.find(
        u => u.DS_UNIDADE === input || u.CD_UNIDADE === input
      )
      return { ...l, cdUnidade: matched?.CD_UNIDADE, dsUnidade: matched?.DS_UNIDADE ?? input }
    })
    onConfirm(updated)
  }

  return (
    <div className="card card-p flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Ruler size={16} style={{ color: 'var(--brand)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Informe a unidade para cada classificação
        </p>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>Espécie</th>
              <th>Classe</th>
              <th>Subclasse</th>
              <th>Unidade *</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i}>
                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.especieTexto}
                </td>
                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.classeTexto}
                </td>
                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.subclasseTexto}
                </td>
                <td>
                  <input
                    list={uid + '-unidades'}
                    value={unidades[i] ?? ''}
                    onChange={e => setUnidades(prev => ({ ...prev, [i]: e.target.value }))}
                    className="input-field w-full"
                    placeholder={loadingUnidades ? 'Carregando…' : 'Digite ou selecione…'}
                    disabled={loadingUnidades}
                    autoComplete="off"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id={uid + '-unidades'}>
          {unidadesList.map(u => (
            <option key={u.CD_UNIDADE} value={u.DS_UNIDADE} />
          ))}
        </datalist>
      </div>

      {!todosPreenchidos && (
        <div className="alert alert-warning">
          <AlertTriangle size={14} />
          <span>Informe a unidade para todas as classificações para prosseguir.</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button className="btn btn-secondary flex items-center gap-1.5" onClick={onBack}>
          <ChevronLeft size={15} /> Voltar
        </button>
        <button
          className="btn btn-gradient flex items-center gap-1.5"
          disabled={!todosPreenchidos || loadingUnidades}
          onClick={handleConfirm}
        >
          {loadingUnidades
            ? <><Loader2 size={14} className="animate-spin" /> Carregando…</>
            : <>Próxima Etapa <ChevronRight size={15} /></>}
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function snFromExcel(val: string): 'S' | 'N' {
  const v = String(val ?? '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return (v === 'SIM' || v === 'S') ? 'S' : 'N'
}

// ─── Etapa 4: Vínculo ─────────────────────────────────────────────────────────

function EtapaVinculo({
  resultado,
  linhas: linhasExternas,
  onBack,
}: {
  resultado: Extract<ParseResult, { ok: true }>
  linhas?: ClassificacaoLinha[]
  onBack: () => void
}) {
  const { rows, headers, total } = resultado

  const uid = useId()

  // ── Linhas manuais (adicionadas pelo usuário nesta tela) ─────────────────────
  const [linhas, setLinhas] = useState<ClassificacaoLinha[]>(linhasExternas ?? [])

  const [especies,   setEspecies] = useState<EspecieMvDTO[]>([])
  const [loadingEsp, startEsp]   = useTransition()

  useEffect(() => {
    startEsp(async () => setEspecies(await listarEspecies()))
  }, [])



  // Linhas sintéticas — placeholder inicial, substituído pelas descrições reais do MV ao montar
  const [syntheticLinhas, setSyntheticLinhas] = useState<ClassificacaoLinha[]>(() => {
    const seen = new Map<string, ClassificacaoLinha>()
    rows.forEach(row => {
      const e = row.cd_especie?.trim()
      const c = row.cd_classe?.trim()
      const s = row.cd_sub_cla?.trim()
      if (!e || !c || !s) return
      const key = `${e}|${c}|${s}`
      if (!seen.has(key)) {
        seen.set(key, {
          especieTexto:   `Espécie ${e}`,
          classeTexto:    `Classe ${c}`,
          subclasseTexto: `Sub ${s}`,
          cdEspecie:      Number(e),
          cdClasse:       Number(c),
          cdSubCla:       Number(s),
        })
      }
    })
    return Array.from(seen.values())
  })

  // Resolve descrições reais para linhas sintéticas (uma única vez ao montar)
  const [, startSynthetic] = useTransition()
  useEffect(() => {
    if (syntheticLinhas.length === 0) return
    startSynthetic(async () => {
      const especies = await listarEspecies()
      const updated = await Promise.all(
        syntheticLinhas.map(async l => {
          const especie = especies.find(e => e.CD_ESPECIE === l.cdEspecie)
          if (!especie || l.cdEspecie === undefined || l.cdClasse === undefined || l.cdSubCla === undefined) return l
          const classes = await listarClasses(especie.CD_ESPECIE)
          const classe = classes.find(c => c.CD_CLASSE === l.cdClasse)
          if (!classe) return { ...l, especieTexto: especie.DS_ESPECIE }
          const subclasses = await listarSubClasses(especie.CD_ESPECIE, classe.CD_CLASSE)
          const subclasse = subclasses.find(s => s.CD_SUB_CLA === l.cdSubCla)
          return {
            ...l,
            especieTexto:   especie.DS_ESPECIE,
            classeTexto:    classe.DS_CLASSE,
            subclasseTexto: subclasse?.DS_SUB_CLA ?? l.subclasseTexto,
          }
        })
      )
      setSyntheticLinhas(updated)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Todas as linhas visíveis no select: manuais (da Etapa 2) + sintéticas (da planilha)
  const todasLinhas = useMemo<ClassificacaoLinha[]>(
    () => [...linhas, ...syntheticLinhas],
    [linhas, syntheticLinhas]
  )

  const [busca,        setBusca]        = useState('')
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())

  // Seletores em cascata para aplicação em massa de classificação
  const [bulkEspVal,  setBulkEspVal]  = useState('')
  const [bulkClaVal,  setBulkClaVal]  = useState('')
  const [bulkSubVal,  setBulkSubVal]  = useState('')
  const [bulkClasses, setBulkClasses] = useState<ClasseMvDTO[]>([])
  const [bulkSubs,    setBulkSubs]    = useState<SubClasseMvDTO[]>([])
  const [loadingBulkCla, startBulkCla] = useTransition()
  const [loadingBulkSub, startBulkSub] = useTransition()

  function handleBulkEspChange(val: string) {
    setBulkEspVal(val); setBulkClaVal(''); setBulkSubVal('')
    setBulkClasses([]); setBulkSubs([])
    const m = especies.find(e => e.DS_ESPECIE === val)
    if (m) startBulkCla(async () => setBulkClasses(await listarClasses(m.CD_ESPECIE)))
  }
  function handleBulkClaChange(val: string) {
    setBulkClaVal(val); setBulkSubVal('')
    setBulkSubs([])
    const esp = especies.find(e => e.DS_ESPECIE === bulkEspVal)
    const cla = bulkClasses.find(c => c.DS_CLASSE === val)
    if (esp && cla) startBulkSub(async () => setBulkSubs(await listarSubClasses(esp.CD_ESPECIE, cla.CD_CLASSE)))
  }
  function handleBulkSubChange(val: string) { setBulkSubVal(val) }

  // Resolve os 3 selects em massa para um índice em todasLinhas
  const bulkLinhaIdx = useMemo(() => {
    if (!bulkEspVal || !bulkClaVal || !bulkSubVal) return -1
    return todasLinhas.findIndex(
      l => l.especieTexto === bulkEspVal && l.classeTexto === bulkClaVal && l.subclasseTexto === bulkSubVal
    )
  }, [bulkEspVal, bulkClaVal, bulkSubVal, todasLinhas])

  // vinculos: índice em todasLinhas (não em linhas)
  const [vinculos, setVinculos] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {}
    rows.forEach((row, i) => {
      const e = row.cd_especie?.trim()
      const c = row.cd_classe?.trim()
      const s = row.cd_sub_cla?.trim()
      if (!e || !c || !s) return
      const key = `${e}|${c}|${s}`
      const synIdx = Array.from(
        (function* () {
          let idx = 0
          const seen = new Map<string, number>()
          rows.forEach(r => {
            const ke = `${r.cd_especie?.trim()}|${r.cd_classe?.trim()}|${r.cd_sub_cla?.trim()}`
            if (r.cd_especie?.trim() && r.cd_classe?.trim() && r.cd_sub_cla?.trim() && !seen.has(ke)) {
              seen.set(ke, idx++)
            }
          })
          yield seen
        })()
      )[0]
      const syntheticIdx = synIdx?.get(key)
      if (syntheticIdx !== undefined) {
        // offset por linhas manuais (ainda vazias no init, linhas.length = 0 aqui)
        initial[i] = syntheticIdx // será corrigido em todasLinhas após merge
      }
    })
    return initial
  })

  // Após merge, garante que vinculos pré-computados de linhas sintéticas usam índice em todasLinhas
  const vinculosEfetivos = useMemo<Record<number, number>>(() => {
    if (syntheticLinhas.length === 0) return vinculos
    const result = { ...vinculos }
    rows.forEach((row, i) => {
      if (result[i] !== undefined) return // já definido manualmente
      const e = row.cd_especie?.trim()
      const c = row.cd_classe?.trim()
      const s = row.cd_sub_cla?.trim()
      if (!e || !c || !s) return
      const synIdx = syntheticLinhas.findIndex(
        l => l.cdEspecie === Number(e) && l.cdClasse === Number(c) && l.cdSubCla === Number(s)
      )
      if (synIdx !== -1) result[i] = linhas.length + synIdx
    })
    return result
  }, [vinculos, syntheticLinhas, linhas, rows])

  // Unidades — carregadas para o bulk e para resolver overrides
  const [unidadesList,    setUnidadesList]    = useState<UnidadeMvDTO[]>([])
  const [bulkUnidade,     setBulkUnidade]     = useState('')
  const [loadingUnidades, startUnidades]      = useTransition()

  // Override de unidade por linha — pré-populado a partir de cd_unidade da planilha
  const [unidadeOverrides, setUnidadeOverrides] = useState<Record<number, string>>(
    () => Object.fromEntries(
      rows.flatMap((row, i) => (row.cd_unidade?.trim() ? [[i, row.cd_unidade.trim()]] : []))
    )
  )

  useEffect(() => {
    startUnidades(async () => {
      const res = await listarUnidades()
      setUnidadesList(res)
    })
  }, [])

  // Resolve texto (DS_UNIDADE ou CD_UNIDADE) → CD_UNIDADE
  function resolveUnidade(text: string): string | undefined {
    const t = text.trim()
    if (!t) return undefined
    const matched = unidadesList.find(u => u.DS_UNIDADE === t || u.CD_UNIDADE === t)
    return matched?.CD_UNIDADE ?? t
  }

  // Estado de importação
  const [importando,  setImportando]  = useState(false)
  const [concluido,   setConcluido]   = useState(false)
  const [resultados,  setResultados]  = useState<Record<number, CadastroResult>>({})

  const nomeKey = useMemo(() => {
    const candidates = ['ds_produto', 'DS_PRODUTO', 'nome', 'NOME', 'descricao', 'DESCRICAO']
    return candidates.find(k => headers.includes(k)) ?? headers[0] ?? ''
  }, [headers])

  const visiveis = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return rows
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => !q || (row[nomeKey] ?? '').toLowerCase().includes(q))
  }, [rows, nomeKey, busca])

  const totalVinculados      = Object.keys(vinculosEfetivos).length
  const todosVisivelMarcados = visiveis.length > 0 && visiveis.every(({ i }) => selecionados.has(i))
  const alguemVisivel        = visiveis.some(({ i }) => selecionados.has(i))

  function toggleRow(i: number) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  function toggleTodosVisiveis() {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (todosVisivelMarcados) visiveis.forEach(({ i }) => next.delete(i))
      else visiveis.forEach(({ i }) => next.add(i))
      return next
    })
  }

  // Resolve os selects bulk para um índice em todasLinhas.
  // Se a combinação não existe ainda em todasLinhas, adiciona automaticamente a linhas.
  function resolverOuAdicionarBulkLinha(): number {
    const idx = todasLinhas.findIndex(
      l => l.especieTexto === bulkEspVal && l.classeTexto === bulkClaVal && l.subclasseTexto === bulkSubVal
    )
    if (idx >= 0) return idx
    // Auto-adicionar
    const novaLinha: ClassificacaoLinha = {
      especieTexto: bulkEspVal,
      classeTexto:  bulkClaVal,
      subclasseTexto: bulkSubVal,
      cdEspecie: especies.find(e => e.DS_ESPECIE === bulkEspVal)?.CD_ESPECIE,
      cdClasse:  bulkClasses.find(c => c.DS_CLASSE === bulkClaVal)?.CD_CLASSE,
      cdSubCla:  bulkSubs.find(s => s.DS_SUB_CLA === bulkSubVal)?.CD_SUB_CLA,
    }
    const novoIdx = linhas.length // posição em todasLinhas após a adição
    setLinhas(prev => [...prev, novaLinha])
    return novoIdx
  }

  function aplicarAosSelecionados() {
    if (selecionados.size === 0 || !bulkEspVal || !bulkClaVal || !bulkSubVal) return
    const idx = resolverOuAdicionarBulkLinha()
    setVinculos(prev => {
      const next = { ...prev }
      selecionados.forEach(i => { next[i] = idx })
      return next
    })
    setSelecionados(new Set())
  }

  function aplicarATodosVisiveis() {
    if (!bulkEspVal || !bulkClaVal || !bulkSubVal) return
    const idx = resolverOuAdicionarBulkLinha()
    setVinculos(prev => {
      const next = { ...prev }
      visiveis.forEach(({ i }) => { next[i] = idx })
      return next
    })
    setSelecionados(new Set())
  }

  // Resolve DS_UNIDADE → CD_UNIDADE antes de armazenar
  function resolveBulkCdUnidade(): string {
    const found = unidadesList.find(u => u.DS_UNIDADE === bulkUnidade || u.CD_UNIDADE === bulkUnidade)
    return found?.CD_UNIDADE ?? bulkUnidade
  }

  function aplicarUnidadeAosSelecionados() {
    if (!bulkUnidade.trim() || selecionados.size === 0) return
    const cd = resolveBulkCdUnidade()
    setUnidadeOverrides(prev => {
      const next = { ...prev }
      selecionados.forEach(i => { next[i] = cd })
      return next
    })
    setSelecionados(new Set())
  }

  function aplicarUnidadeATodosVisiveis() {
    if (!bulkUnidade.trim()) return
    const cd = resolveBulkCdUnidade()
    setUnidadeOverrides(prev => {
      const next = { ...prev }
      visiveis.forEach(({ i }) => { next[i] = cd })
      return next
    })
    setSelecionados(new Set())
  }

  function setVinculo(rowIdx: number, linhaIdx: number | null) {
    setVinculos(prev => {
      const next = { ...prev }
      if (linhaIdx === null) delete next[rowIdx]; else next[rowIdx] = linhaIdx
      return next
    })
  }

  const labelLinha = (l: ClassificacaoLinha) =>
    `${l.especieTexto} › ${l.classeTexto} › ${l.subclasseTexto}${l.dsUnidade ? ` · ${l.dsUnidade}` : ''}`

  // Todos os vinculados (para exibir durante e após a importação)
  const vinculadosOrdenados = useMemo(() =>
    rows
      .map((row, i) => ({ row, i }))
      .filter(({ i }) => vinculosEfetivos[i] !== undefined),
  [rows, vinculosEfetivos])

  async function handleConfirmarImportacao() {
    setImportando(true)
    const novosResultados: Record<number, CadastroResult> = {}

    for (const { row, i } of vinculadosOrdenados) {
      const linha = todasLinhas[vinculosEfetivos[i]]

      if (linha.cdEspecie === undefined || linha.cdClasse === undefined || linha.cdSubCla === undefined) {
        novosResultados[i] = { ok: false, erro: 'Classificação sem códigos resolvidos no MV.' }
        setResultados({ ...novosResultados })
        continue
      }

      // Unidade efetiva: override da tela/planilha tem prioridade sobre a linha de classificação
      const cdUnidadeEfetiva = unidadeOverrides[i]
        ? (resolveUnidade(unidadeOverrides[i]) ?? linha.cdUnidade)
        : linha.cdUnidade

      if (!cdUnidadeEfetiva) {
        novosResultados[i] = { ok: false, erro: 'Unidade não resolvida no MV.' }
        setResultados({ ...novosResultados })
        continue
      }

      const payload: CadastroProdutoPayload = {
        ds_produto:          row.ds_produto ?? '',
        ds_comercial:        row.ds_produto || undefined,
        ds_especificacao:    row.ds_produto || undefined,
        sn_lote:             snFromExcel(row.sn_lote),
        sn_validade:         snFromExcel(row.sn_validade),
        sn_medicamento:      snFromExcel(row.sn_medicamento),
        sn_consignado:       snFromExcel(row.sn_consignado),
        sn_opme:             snFromExcel(row.opme_nexo),
        tp_sexo:             'A',
        cd_especie:          linha.cdEspecie,
        cd_classe:           linha.cdClasse,
        cd_sub_cla:          linha.cdSubCla,
        ds_sub_cla:          linha.subclasseTexto,
        cd_unidade:          cdUnidadeEfetiva,
        cd_tip_ativ:         row.cd_tip_ativ ? Number(row.cd_tip_ativ) : undefined,
        cd_sican:            row.codigo_anvisa || undefined,
        cd_pro_fat:          row.cd_pro_fat          || undefined,
        ds_pro_fat:          row.ds_pro_fat           || undefined,
        cd_pro_fat_sus:      row.cd_pro_fat_sus      || undefined,
        cd_procedimento_sus: row.cd_procedimento_sus || undefined,
        empresas:            [1],
      }

      const res = await cadastrarProduto(payload)
      novosResultados[i] = res
      setResultados({ ...novosResultados })
    }

    setImportando(false)
    setConcluido(true)
  }

  return (
    <div className="flex flex-col gap-2">



      {/* Barra de controles — oculta durante/após importação */}
      {!importando && !concluido && (
        <div className="card" style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>

          {/* Linha 1: Classificação em massa */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '0.5rem', alignItems: 'end' }}>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Espécie</label>
              <input list={uid+'-besp'} value={bulkEspVal} onChange={e => handleBulkEspChange(e.target.value)}
                className="input-field w-full text-xs" placeholder="Selecione…" disabled={loadingEsp} autoComplete="off" />
              <datalist id={uid+'-besp'}>{especies.map(e => <option key={e.CD_ESPECIE} value={e.DS_ESPECIE}/>)}</datalist>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Classe</label>
              <input list={uid+'-bcla'} value={bulkClaVal} onChange={e => handleBulkClaChange(e.target.value)}
                className="input-field w-full text-xs"
                placeholder={!bulkEspVal ? '—' : loadingBulkCla ? 'Carregando…' : 'Selecione…'}
                disabled={!bulkEspVal || loadingBulkCla} autoComplete="off" />
              <datalist id={uid+'-bcla'}>{bulkClasses.map(c => <option key={c.CD_CLASSE} value={c.DS_CLASSE}/>)}</datalist>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Subclasse</label>
              <input list={uid+'-bsub'} value={bulkSubVal} onChange={e => handleBulkSubChange(e.target.value)}
                className="input-field w-full text-xs"
                placeholder={!bulkClaVal ? '—' : loadingBulkSub ? 'Carregando…' : 'Selecione…'}
                disabled={!bulkClaVal || loadingBulkSub} autoComplete="off" />
              <datalist id={uid+'-bsub'}>{bulkSubs.map(s => <option key={s.CD_SUB_CLA} value={s.DS_SUB_CLA}/>)}</datalist>
            </div>
            <button className="btn btn-secondary flex items-center gap-1 text-xs whitespace-nowrap"
              disabled={!bulkEspVal || !bulkClaVal || !bulkSubVal || selecionados.size === 0}
              onClick={aplicarAosSelecionados} title="Aplicar classificação aos selecionados">
              <Check size={12}/> Selecionados{selecionados.size > 0 && <span className="badge badge-muted">{selecionados.size}</span>}
            </button>
            <button className="btn btn-primary flex items-center gap-1 text-xs whitespace-nowrap"
              disabled={!bulkEspVal || !bulkClaVal || !bulkSubVal}
              onClick={aplicarATodosVisiveis} title="Aplicar classificação a todos visíveis">
              <Check size={12}/> Todos<span className="badge badge-brand">{visiveis.length}</span>
            </button>
          </div>

          {/* Linha 2: Unidade + Filtro */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.5rem', alignItems: 'end', borderTop: '1px dashed var(--border)', paddingTop: '0.4rem' }}>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Ruler size={10}/> Unidade
              </label>
              <input list={uid+'-bulk-unidades'} value={bulkUnidade} onChange={e => setBulkUnidade(e.target.value)}
                className="input-field w-full text-xs"
                placeholder={loadingUnidades ? 'Carregando…' : 'Selecione…'} disabled={loadingUnidades} autoComplete="off" />
              <datalist id={uid+'-bulk-unidades'}>{unidadesList.map(u => <option key={u.CD_UNIDADE} value={u.DS_UNIDADE}/>)}</datalist>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Search size={10}/> Filtrar produto
              </label>
              <input className="input-field w-full text-xs" placeholder="Nome do produto…"
                value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <button className="btn btn-secondary flex items-center gap-1 text-xs whitespace-nowrap"
              disabled={!bulkUnidade.trim() || selecionados.size === 0}
              onClick={aplicarUnidadeAosSelecionados} title="Aplicar unidade aos selecionados">
              <Ruler size={12}/> Selecionados{selecionados.size > 0 && <span className="badge badge-muted">{selecionados.size}</span>}
            </button>
            <button className="btn btn-primary flex items-center gap-1 text-xs whitespace-nowrap"
              disabled={!bulkUnidade.trim()}
              onClick={aplicarUnidadeATodosVisiveis}>
              <Ruler size={12}/> Todos<span className="badge badge-brand">{visiveis.length}</span>
            </button>
          </div>

        </div>
      )}

      {/* Tabela de produtos */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table" style={{ tableLayout: 'fixed', width: '100%', fontSize: 12 }}>
          <colgroup>
            {!importando && !concluido && <col style={{ width: 32 }} />}
            <col />
            <col style={{ width: '30%' }} />
            <col style={{ width: '16%' }} />
            {(importando || concluido) && <col style={{ width: 40 }} />}
            {(importando || concluido) && <col style={{ width: 40 }} />}
            {(importando || concluido) && <col style={{ width: 88 }} />}
            {(importando || concluido) && <col style={{ width: 36 }} />}
          </colgroup>
          <thead>
            <tr>
              {!importando && !concluido && (
                <th>
                  <input
                    type="checkbox"
                    checked={todosVisivelMarcados}
                    ref={(el: HTMLInputElement | null) => {
                      if (el) el.indeterminate = alguemVisivel && !todosVisivelMarcados
                    }}
                    onChange={toggleTodosVisiveis}
                  />
                </th>
              )}
              <th>Produto</th>
              <th>Classificação</th>
              <th>Unidade</th>
              {(importando || concluido) && <th style={{ textAlign: 'center', fontSize: 11 }}>Lote</th>}
              {(importando || concluido) && <th style={{ textAlign: 'center', fontSize: 11 }}>Val.</th>}
              {(importando || concluido) && <th style={{ textAlign: 'center', fontSize: 11 }}>Cód. MV</th>}
              {(importando || concluido) && <th style={{ textAlign: 'center', fontSize: 11 }}></th>}
            </tr>
          </thead>
          <tbody>
            {(importando || concluido ? vinculadosOrdenados : visiveis).map(({ row, i }) => {
              const vinculoIdx = vinculosEfetivos[i] ?? null
              const resultado  = resultados[i]
              return (
                <tr
                  key={i}
                  style={{
                    fontSize: 12,
                    ...(resultado?.ok === true  ? { background: 'var(--success-muted)' } :
                        resultado?.ok === false ? { background: 'var(--danger-muted)'  } :
                        selecionados.has(i)     ? { background: 'var(--brand-muted)'   } :
                        {})
                  }}
                >
                  {!importando && !concluido && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selecionados.has(i)}
                        onChange={() => toggleRow(i)}
                      />
                    </td>
                  )}
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {row[nomeKey] || '—'}
                    </span>
                  </td>
                  <td style={{ overflow: 'hidden' }}>
                    {importando || concluido ? (
                      <span
                        className="text-xs"
                        style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                      >
                        {vinculoIdx !== null ? labelLinha(todasLinhas[vinculoIdx]) : '—'}
                      </span>
                    ) : (
                      <select
                        className="input-field w-full text-xs"
                        value={vinculoIdx ?? ''}
                        onChange={e =>
                          setVinculo(i, e.target.value === '' ? null : Number(e.target.value))
                        }
                      >
                        <option value="">— Sem classificação —</option>
                        {todasLinhas.map((l, li) => (
                          <option key={li} value={li}>
                            {labelLinha(l)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={{ overflow: 'hidden' }}>
                    {importando || concluido ? (
                      <span
                        className="text-xs"
                        style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                      >
                        {unidadeOverrides[i] || (vinculoIdx !== null ? todasLinhas[vinculoIdx].dsUnidade : null) || '—'}
                      </span>
                    ) : (
                      <select
                        className="input-field w-full text-xs"
                        value={unidadeOverrides[i] ?? ''}
                        onChange={e => setUnidadeOverrides(prev => ({ ...prev, [i]: e.target.value }))}
                      >
                        <option value="">— Sem unidade —</option>
                        {unidadesList.map(u => (
                          <option key={u.CD_UNIDADE} value={u.CD_UNIDADE}>{u.CD_UNIDADE} — {u.DS_UNIDADE}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  {(importando || concluido) && (
                    <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                      <span
                        className={`badge ${snFromExcel(row.sn_lote) === 'S' ? 'badge-brand' : 'badge-muted'}`}
                        style={{ fontSize: 10, padding: '1px 5px' }}
                      >
                        {snFromExcel(row.sn_lote) === 'S' ? 'S' : 'N'}
                      </span>
                    </td>
                  )}
                  {(importando || concluido) && (
                    <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                      <span
                        className={`badge ${snFromExcel(row.sn_validade) === 'S' ? 'badge-brand' : 'badge-muted'}`}
                        style={{ fontSize: 10, padding: '1px 5px' }}
                      >
                        {snFromExcel(row.sn_validade) === 'S' ? 'S' : 'N'}
                      </span>
                    </td>
                  )}
                  {(importando || concluido) && (
                    <td style={{ textAlign: 'center', padding: '4px 4px' }}>
                      {resultado?.ok === true && resultado.cdProduto ? (
                        <span className="badge badge-success" style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                          {resultado.cdProduto}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  )}
                  {(importando || concluido) && (
                    <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                      {resultado === undefined ? (
                        <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                      ) : resultado.ok ? (
                        <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                      ) : (
                        <span title={resultado.erro}>
                          <XCircle size={14} style={{ color: 'var(--danger)' }} />
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
            {!importando && !concluido && visiveis.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}
                >
                  Nenhum produto encontrado para &quot;{busca}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sumário após conclusão */}
      {concluido && (() => {
        const total   = vinculadosOrdenados.length
        const sucesso = vinculadosOrdenados.filter(({ i }) => resultados[i]?.ok === true).length
        const falhas  = total - sucesso
        return (
          <div
            className="card card-p flex flex-wrap items-center gap-4"
            style={{
              background:   falhas === 0 ? 'var(--success-muted)' : 'var(--warning-muted)',
              borderColor:  falhas === 0 ? 'var(--success-border)' : 'var(--warning-border)',
            }}
          >
            <CheckCircle2 size={18} style={{ color: falhas === 0 ? 'var(--success)' : 'var(--warning)', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Importação concluída
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {sucesso} produto{sucesso !== 1 ? 's' : ''} cadastrado{sucesso !== 1 ? 's' : ''} com sucesso
                {falhas > 0 && ` · ${falhas} com erro (passe o mouse sobre o ícone ✗ para ver o detalhe)`}
              </p>
            </div>
          </div>
        )
      })()}

      <div className="flex items-center justify-between">
        <button
          className="btn btn-secondary flex items-center gap-1.5"
          onClick={onBack}
          disabled={importando}
        >
          <ChevronLeft size={15} /> Voltar
        </button>
        {!concluido && (
          <button
            className="btn btn-gradient flex items-center gap-1.5"
            disabled={totalVinculados === 0 || importando}
            onClick={handleConfirmarImportacao}
          >
            {importando ? (
              <><Loader2 size={14} className="animate-spin" /> Importando…</>
            ) : (
              <>
                <FileCheck2 size={15} /> Confirmar Importação
                {totalVinculados > 0 && (
                  <span className="badge badge-brand" style={{ marginLeft: 4 }}>
                    {totalVinculados}
                  </span>
                )}
              </>
            )}
          </button>
        )}
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
    setFile(null); setErro(null); setResultado(null); setEtapa(1)
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
    <div className="flex flex-col gap-3">

      {/* Indicador de etapas */}
      <div className="card card-p py-2.5">
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

      {/* ── Etapa 2: Revisão / Vínculo / Importação ── */}
      {etapa === 2 && resultado && (
        <EtapaVinculo
          resultado={resultado}
          onBack={() => setEtapa(1)}
        />
      )}
    </div>
  )
}
