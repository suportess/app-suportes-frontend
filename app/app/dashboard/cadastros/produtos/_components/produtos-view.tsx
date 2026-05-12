'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Pill, Search, Plus, ChevronLeft, ChevronRight,
  Loader2, X, AlertTriangle, Ruler, Building2,
  CheckCircle2, XCircle, Info,
} from 'lucide-react'
import type { ProdutoMvDTO, UniProPortalDTO, EmpresaProdutoPortalDTO } from '@/lib/types'
import { listarProdutos, listarUniPro, listarEmpresaProduto } from '../actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function Sim() {
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--success)' }}>
      <CheckCircle2 size={11} /> Sim
    </span>
  )
}
function Nao() {
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
      <XCircle size={11} /> Não
    </span>
  )
}
function Flag({ value }: { value: string }) {
  const isTrue = value === 'S' || value?.toUpperCase() === 'SIM'
  return isTrue ? <Sim /> : <Nao />
}

// ─── Modal de detalhe ─────────────────────────────────────────────────────────

type Aba = 'unidades' | 'empresas'

function ProdutoModal({ produto, onClose }: { produto: ProdutoMvDTO; onClose: () => void }) {
  const [aba, setAba] = useState<Aba>('unidades')
  const [unidades, setUnidades] = useState<UniProPortalDTO[]>([])
  const [empresas, setEmpresas] = useState<EmpresaProdutoPortalDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setErro(null)
    Promise.all([
      listarUniPro(produto.CD_PRODUTO),
      listarEmpresaProduto(produto.CD_PRODUTO),
    ])
      .then(([u, e]) => { setUnidades(u); setEmpresas(e) })
      .catch(err => setErro(err instanceof Error ? err.message : 'Erro ao carregar detalhes.'))
      .finally(() => setLoading(false))
  }, [produto.CD_PRODUTO])

  const tipoLabel: Record<string, string> = { R: 'Referencial', C: 'Complementar', E: 'Embalagem' }

  return (
    <Dialog.Portal>
      <Dialog.Overlay
        className="fixed inset-0 z-40 animate-fade-up"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      />
      <Dialog.Content
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--purple-muted)' }}
            >
              <Pill size={16} style={{ color: 'var(--purple)' }} />
            </div>
            <div className="min-w-0">
              <Dialog.Title
                className="text-sm font-semibold leading-snug truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {produto.DS_PRODUTO}
              </Dialog.Title>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                #{produto.CD_PRODUTO}
                {produto.DS_SUB_CLA && <> · {produto.DS_SUB_CLA}</>}
              </p>
            </div>
          </div>
          <Dialog.Close asChild>
            <button className="icon-btn flex-shrink-0" onClick={onClose}>
              <X size={15} style={{ color: 'var(--text-muted)' }} />
            </button>
          </Dialog.Close>
        </div>

        {/* Flags rápidas */}
        <div
          className="flex flex-wrap gap-x-5 gap-y-1 px-5 py-3 border-b text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <span className="flex items-center gap-1.5">Lote: <Flag value={produto.SN_LOTE} /></span>
          <span className="flex items-center gap-1.5">Validade: <Flag value={produto.SN_VALIDADE} /></span>
          <span className="flex items-center gap-1.5">Medicamento: <Flag value={produto.SN_MEDICAMENTO} /></span>
          <span className="flex items-center gap-1.5">Consignado: <Flag value={produto.SN_CONSIGNADO} /></span>
          {produto.DS_UNIDADE_REF && (
            <span className="flex items-center gap-1.5">
              Und. ref: <span className="badge badge-muted">{produto.DS_UNIDADE_REF}</span>
            </span>
          )}
        </div>

        {/* Abas */}
        <div
          className="flex border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          {(['unidades', 'empresas'] as Aba[]).map(a => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors"
              style={{
                borderColor: aba === a ? 'var(--brand)' : 'transparent',
                color: aba === a ? 'var(--brand)' : 'var(--text-muted)',
              }}
            >
              {a === 'unidades' ? <Ruler size={13} /> : <Building2 size={13} />}
              {a === 'unidades' ? 'Unidades de medida' : 'Empresas vinculadas'}
              <span
                className="badge badge-muted text-[10px]"
                style={{ padding: '0 5px' }}
              >
                {a === 'unidades' ? unidades.length : empresas.length}
              </span>
            </button>
          ))}
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--text-muted)' }}>
              <Loader2 size={18} className="animate-spin" /> Carregando...
            </div>
          )}
          {erro && (
            <div className="alert alert-warning">
              <AlertTriangle size={14} /> <span>{erro}</span>
            </div>
          )}
          {!loading && !erro && aba === 'unidades' && (
            unidades.length === 0
              ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Nenhuma unidade cadastrada.</p>
              : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>Fator</th>
                        <th>Tipo</th>
                        <th>Prescrição</th>
                        <th>Ativo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unidades.map(u => (
                        <tr key={u.CD_UNI_PRO}>
                          <td><span className="badge badge-muted">{u.CD_UNIDADE}</span></td>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.DS_UNIDADE}</td>
                          <td style={{ color: 'var(--text-primary)' }}>{u.VL_FATOR}</td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: u.TP_RELATORIOS === 'R' ? 'var(--success-muted)' : 'var(--surface-2, var(--border))',
                                color: u.TP_RELATORIOS === 'R' ? 'var(--success)' : 'var(--text-muted)',
                              }}
                            >
                              {tipoLabel[u.TP_RELATORIOS] ?? u.TP_RELATORIOS}
                            </span>
                          </td>
                          <td><Flag value={u.SN_PRESCRICAO} /></td>
                          <td><Flag value={u.SN_ATIVO} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}
          {!loading && !erro && aba === 'empresas' && (
            empresas.length === 0
              ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Nenhuma empresa vinculada.</p>
              : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Empresa</th>
                        <th>Saldo atual</th>
                        <th>Mín.</th>
                        <th>Máx.</th>
                        <th>Custo médio</th>
                        <th>Ativo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresas.map(e => (
                        <tr key={e.CD_MULTI_EMPRESA}>
                          <td><span className="badge badge-muted">Emp. {e.CD_MULTI_EMPRESA}</span></td>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {e.QT_ESTOQUE_ATUAL != null ? e.QT_ESTOQUE_ATUAL.toLocaleString('pt-BR') : '—'}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {e.QT_ESTOQUE_MINIMO != null ? e.QT_ESTOQUE_MINIMO.toLocaleString('pt-BR') : '—'}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {e.QT_ESTOQUE_MAXIMO != null ? e.QT_ESTOQUE_MAXIMO.toLocaleString('pt-BR') : '—'}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {e.VL_CUSTO_MEDIO ? `R$ ${e.VL_CUSTO_MEDIO}` : '—'}
                          </td>
                          <td><Flag value={e.SN_ATIVO} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}

// ─── View principal ────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

type Props = {
  initialData: ProdutoMvDTO[]
  initialPage: number
  initialHasMore: boolean
}

export function ProdutosView({ initialData, initialPage, initialHasMore }: Props) {
  const [busca, setBusca]             = useState('')
  const [page, setPage]               = useState(initialPage)
  const [data, setData]               = useState<ProdutoMvDTO[]>(initialData)
  const [hasMore, setHasMore]         = useState(initialHasMore)
  const [selectedProduto, setSelected] = useState<ProdutoMvDTO | null>(null)
  const [isPending, startTransition]  = useTransition()
  const [erro, setErro]               = useState<string | null>(null)
  const isFirstRender = useRef(true)

  const debouncedBusca = useDebounce(busca, 400)

  // Quando a busca debounced muda: reseta para página 1
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setPage(1)
  }, [debouncedBusca])

  // Quando page ou debouncedBusca mudam: busca dados
  useEffect(() => {
    if (isFirstRender.current) return
    startTransition(async () => {
      try {
        setErro(null)
        const res = await listarProdutos(debouncedBusca, page, PAGE_SIZE)
        setData(res.dados ?? [])
        setHasMore((res.dados?.length ?? 0) === PAGE_SIZE)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao buscar produtos.')
      }
    })
  }, [debouncedBusca, page])

  const columns: ColumnDef<ProdutoMvDTO>[] = [
    { id: 'cd', accessorKey: 'CD_PRODUTO', header: '#',
      cell: ({ getValue }) => (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{getValue<string>()}</span>
      ),
      size: 70,
    },
    { id: 'nome', accessorKey: 'DS_PRODUTO', header: 'Produto',
      cell: ({ getValue }) => (
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getValue<string>()}</span>
      ),
    },
    { id: 'unidade', accessorKey: 'DS_UNIDADE_REF', header: 'Und.',
      cell: ({ getValue }) => {
        const v = getValue<string | null>()
        return v ? <span className="badge badge-muted">{v}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
      },
      size: 80,
    },
    { id: 'subcla', accessorKey: 'DS_SUB_CLA', header: 'Classificação',
      cell: ({ getValue }) => (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {getValue<string | null>() ?? '—'}
        </span>
      ),
    },
    { id: 'consig', accessorKey: 'SN_CONSIGNADO', header: 'Consignado',
      cell: ({ getValue }) => <Flag value={getValue<string>()} />,
      size: 100,
    },
    { id: 'lote', accessorKey: 'SN_LOTE', header: 'Ctrl. Lote',
      cell: ({ getValue }) => <Flag value={getValue<string>()} />,
      size: 90,
    },
    { id: 'med', accessorKey: 'SN_MEDICAMENTO', header: 'Medicamento',
      cell: ({ getValue }) => <Flag value={getValue<string>()} />,
      size: 100,
    },
    { id: 'acoes', header: '',
      cell: ({ row }) => (
        <button
          className="icon-btn"
          title="Ver detalhes"
          onClick={() => setSelected(row.original)}
        >
          <Info size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>
      ),
      size: 40,
    },
  ]

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <Dialog.Root open={!!selectedProduto} onOpenChange={open => { if (!open) setSelected(null) }}>
      <div className="flex flex-col gap-4">

        {/* Barra de busca */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-52 input-field">
            {isPending
              ? <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              : <Search size={14} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            }
            <input
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Buscar por nome do produto…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            {busca && (
              <button onClick={() => setBusca('')} className="icon-btn p-0.5">
                <X size={12} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>
          <button className="btn btn-gradient">
            <Plus size={15} /> Novo Produto
          </button>
        </div>

        {erro && (
          <div className="alert alert-warning">
            <AlertTriangle size={14} /> <span>{erro}</span>
          </div>
        )}

        {/* Tabela */}
        {data.length > 0 ? (
          <div className="data-table-wrap" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}>
            <table className="data-table">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(h => (
                      <th key={h.id} style={{ width: h.getSize() !== 150 ? h.getSize() : undefined }}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(row.original)}
                    style={{ transition: 'background 0.1s' }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} onClick={e => cell.column.id === 'acoes' && e.stopPropagation()}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginação */}
            <div className="table-footer flex items-center justify-between">
              <span>
                Página {page} · {data.length} resultado{data.length !== 1 ? 's' : ''}
                {busca && <> para &quot;<strong>{busca}</strong>&quot;</>}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="icon-btn"
                  disabled={page === 1 || isPending}
                  onClick={() => setPage(p => p - 1)}
                  title="Página anterior"
                >
                  <ChevronLeft size={15} style={{ color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)' }} />
                </button>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-2, var(--border))', color: 'var(--text-primary)' }}>
                  {page}
                </span>
                <button
                  className="icon-btn"
                  disabled={!hasMore || isPending}
                  onClick={() => setPage(p => p + 1)}
                  title="Próxima página"
                >
                  <ChevronRight size={15} style={{ color: !hasMore ? 'var(--text-muted)' : 'var(--text-primary)' }} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          !isPending && (
            <div className="card">
              <div className="card-p flex flex-col items-center py-12 gap-3">
                <Pill size={32} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {busca ? `Nenhum produto encontrado para "${busca}".` : 'Nenhum produto cadastrado.'}
                </p>
                {busca && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setBusca('')}>
                    Limpar busca
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Modal de detalhe */}
      {selectedProduto && <ProdutoModal produto={selectedProduto} onClose={() => setSelected(null)} />}
    </Dialog.Root>
  )
}
