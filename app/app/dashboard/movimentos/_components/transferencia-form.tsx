'use client'

import { useState, useCallback } from 'react'
import { ArrowUpDown, AlertTriangle, CheckCircle2, Loader2, ChevronLeft, Check, ArrowRight } from 'lucide-react'
import type { EmpresaDTO, EntradaProdutoPortalDTO, ProdutoDetalhePortalDTO, TransferenciaConsignadoDTO } from '@/lib/types'
import { PaginatedCombobox, type ComboboxItem, type FetchPageFn } from './paginated-combobox'
import {
  listarMultiEmpresas,
  listarEstoques,
  listarProdutosConsignados,
  buscarSaldoLote,
  buscarProdutoDetalhe,
  listarEntradas,
  salvarTransferencia,
  concluirTransferencia,
} from '../actions'

// --- Tipos --------------------------------------------------------------------

// Formata datas (YYYY-MM-DD ou ISO) sem deslocamento de fuso UTC
function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const [y, m, d] = value.substring(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
}

type Props = {
  empresaConf: EmpresaDTO
  onVoltar?: () => void
  onConcluido?: () => void
}

// --- Campo simples -------------------------------------------------------------

function Campo({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  disabled = false,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <div className="input-field" style={{ opacity: disabled ? 0.45 : 1 }}>
        <input
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          className="bg-transparent outline-none text-sm flex-1 w-full"
          style={{
            color: 'var(--text-primary)',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          value={value}
          onChange={e => onChange?.(e.target.value)}
        />
      </div>
    </div>
  )
}

// --- Label de secao -----------------------------------------------------------

function SecaoLabel({ label, cor }: { label: string; cor: string }) {
  return (
    <span
      className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
      style={{
        color: cor,
        background: `${cor}18`,
        border: `1px solid ${cor}30`,
        width: 'fit-content',
      }}
    >
      {label}
    </span>
  )
}

// --- Bloco de selecao paginada ------------------------------------------------

function CampoCombobox({
  label,
  value,
  onChange,
  fetchPage,
  placeholder,
  disabled = false,
  dropdownLabel,
}: {
  label: string
  value: ComboboxItem | null
  onChange: (item: ComboboxItem) => void
  fetchPage: FetchPageFn
  placeholder: string
  disabled?: boolean
  dropdownLabel?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <PaginatedCombobox
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        fetchPage={fetchPage}
        dropdownLabel={dropdownLabel}
        pageSize={15}
      />
    </div>
  )
}

// --- Campos de leitura --------------------------------------------------------

function SaldoField({ label, value, loading, active }: { label: string; value: string; loading: boolean; active: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <div className="input-field" style={{ opacity: !active || loading ? 0.45 : 1, minHeight: '2.375rem' }}>
        {loading
          ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--brand)' }} />
          : <span className="text-sm" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>{value || '-'}</span>
        }
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex-1 h-px" style={{ background: 'var(--d2b-border)' }} />
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}>
        <ArrowUpDown size={12} style={{ color: 'var(--text-muted)' }} />
      </div>
      <div className="flex-1 h-px" style={{ background: 'var(--d2b-border)' }} />
    </div>
  )
}

// --- Componente principal -----------------------------------------------------

export function TransferenciaForm({ empresaConf, onVoltar, onConcluido }: Props) {
  const empresaId = empresaConf.id

  // -- ORIGEM -----------------------------------------------------------------
  const [origemEmpresa, setOrigemEmpresa] = useState<ComboboxItem | null>(null)
  const [origemEstoque, setOrigemEstoque] = useState<ComboboxItem | null>(null)
  const [origemProduto, setOrigemProduto] = useState<ComboboxItem | null>(null)
  const [origemUnidade, setOrigemUnidade] = useState('')
  const [origemQtd, setOrigemQtd] = useState('')

  // -- ENTRADA (step 2) -------------------------------------------------------
  const [origemEntrada, setOrigemEntrada] = useState<ComboboxItem | null>(null)
  const [origemEntradaDetails, setOrigemEntradaDetails] = useState<EntradaProdutoPortalDTO | null>(null)

  // -- DESTINO ----------------------------------------------------------------
  // Estoque = mesmo da origem (fixo)
  const [destinoProduto, setDestinoProduto] = useState<ComboboxItem | null>(null)
  const [destinoUnidade, setDestinoUnidade] = useState('')
  const [destinoQtd, setDestinoQtd] = useState('')

  // -- OPERACAO (step 3) -----------------------------------------------------
  const [tipoMovimento, setTipoMovimento] = useState<'DEVOLUCAO' | 'BAIXA'>('DEVOLUCAO')
  const [quantidade, setQuantidade] = useState('')
  const [destinoProdutoDetalhe, setDestinoProdutoDetalhe] = useState<ProdutoDetalhePortalDTO | null>(null)
  const [destinoProdutoDetalheLoading, setDestinoProdutoDetalheLoading] = useState(false)
  const [cdLote, setCdLote] = useState('')
  const [dtValidade, setDtValidade] = useState('')

  // -- UI ---------------------------------------------------------------------
  const [step, setStep] = useState(1)
  const TOTAL_STEPS = 4
  const [concluindo, setConcluindo] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [origemSaldoLoading, setOrigemSaldoLoading] = useState(false)
  const [destinoSaldoLoading, setDestinoSaldoLoading] = useState(false)
  // transferência salva (step 3 → 4)
  const [transferenciaId, setTransferenciaId] = useState<number | null>(null)
  const [salvandoStep4, setSalvandoStep4] = useState(false)
  // modal de confirmação
  const [showConfirm, setShowConfirm] = useState(false)
  // -- fetchPage functions ----------------------------------------------------

  const fetchEmpresas: FetchPageFn = useCallback(async () => {
    const data = await listarMultiEmpresas(empresaId)
    return {
      items: data.map(e => ({ id: e.CD_MULTI_EMPRESA, label: e.DS_MULTI_EMPRESA })),
      hasMore: false,
    }
  }, [empresaId])

  const fetchEstoques: FetchPageFn = useCallback(
    async (page, pageSize) => {
      if (!origemEmpresa) return { items: [], hasMore: false }
      const res = await listarEstoques(empresaId, origemEmpresa.id, page, pageSize)
      return {
        items: (res.dados ?? []).map(e => ({ id: Number(e.CD_ESTOQUE), label: e.DS_ESTOQUE })),
        hasMore: (res.dados ?? []).length === pageSize,
      }
    },
    [empresaId, origemEmpresa],
  )

  const fetchProdutosOrigem: FetchPageFn = useCallback(
    async (page, pageSize) => {
      if (!origemEmpresa || !origemEstoque) return { items: [], hasMore: false }
      const res = await listarProdutosConsignados(
        empresaId,
        origemEmpresa.id,
        origemEstoque.id,
        page,
        pageSize,
      )
      return {
        items: (res.dados ?? []).map(p => ({ id: Number(p.CD_PRODUTO), label: p.DS_PRODUTO })),
        hasMore: (res.dados ?? []).length === pageSize,
      }
    },
    [empresaId, origemEmpresa, origemEstoque],
  )

  // Destino usa o mesmo estoque da origem para buscar produtos
  const fetchProdutosDestino: FetchPageFn = useCallback(
    async (page, pageSize) => {
      if (!origemEmpresa || !origemEstoque) return { items: [], hasMore: false }
      const res = await listarProdutosConsignados(
        empresaId,
        origemEmpresa.id,
        origemEstoque.id,
        page,
        pageSize,
      )
      return {
        items: (res.dados ?? []).map(p => ({ id: Number(p.CD_PRODUTO), label: p.DS_PRODUTO })),
        hasMore: (res.dados ?? []).length === pageSize,
      }
    },
    [empresaId, origemEmpresa, origemEstoque],
  )

  const fetchEntradas: FetchPageFn = useCallback(
    async (page, pageSize) => {
      if (!origemEstoque || !origemProduto) return { items: [], hasMore: false }
      const res = await listarEntradas(empresaId, origemEstoque.id, origemProduto.id, page, pageSize)
      return {
        items: (res.dados ?? []).map(e => ({
          id: Number(e.CD_ENT_PRO),
          label: `#${e.CD_ENT_PRO} - ${e.NM_FORNECEDOR}${e.CD_LOTE ? ` | Lote: ${e.CD_LOTE}` : ''}`,
          data: e,
        })),
        hasMore: (res.dados ?? []).length === pageSize,
      }
    },
    [empresaId, origemEstoque, origemProduto],
  )

  // -- Handlers ---------------------------------------------------------------

  function handleSelecionarEmpresa(item: ComboboxItem) {
    setOrigemEmpresa(item)
    setOrigemEstoque(null)
    setOrigemProduto(null)
    setDestinoProduto(null)
    setSucesso(null)
    setErro(null)
  }

  function handleSelecionarEstoque(item: ComboboxItem) {
    setOrigemEstoque(item)
    setOrigemProduto(null)
    setOrigemUnidade('')
    setOrigemQtd('')
    setDestinoProduto(null)
    setDestinoUnidade('')
    setDestinoQtd('')
    setSucesso(null)
    setErro(null)
  }

  async function handleSelecionarProdutoOrigem(item: ComboboxItem) {
    setOrigemProduto(item)
    setOrigemUnidade('')
    setOrigemQtd('')
    setOrigemEntrada(null)
    setOrigemEntradaDetails(null)
    if (!origemEstoque) return
    setOrigemSaldoLoading(true)
    setErro(null)
    try {
      const saldo = await buscarSaldoLote(empresaId, origemEstoque.id, item.id)
      if (saldo) {
        setOrigemUnidade(saldo.DS_UNIDADE ?? '')
        setOrigemQtd(saldo.QT_ESTOQUE_ATUAL != null ? String(saldo.QT_ESTOQUE_ATUAL) : '')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao buscar saldo do produto de origem.')
    } finally {
      setOrigemSaldoLoading(false)
    }
  }

  async function handleSelecionarProdutoDestino(item: ComboboxItem) {
    setDestinoProduto(item)
    setDestinoUnidade('')
    setDestinoQtd('')
    if (!origemEstoque) return
    setDestinoSaldoLoading(true)
    setErro(null)
    try {
      const saldo = await buscarSaldoLote(empresaId, origemEstoque.id, item.id)
      if (saldo) {
        setDestinoUnidade(saldo.DS_UNIDADE ?? '')
        setDestinoQtd(saldo.QT_ESTOQUE_ATUAL != null ? String(saldo.QT_ESTOQUE_ATUAL) : '')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao buscar saldo do produto de destino.')
    } finally {
      setDestinoSaldoLoading(false)
    }
  }

  function handleSelecionarEntrada(item: ComboboxItem) {
    setOrigemEntrada(item)
    setOrigemEntradaDetails((item.data as EntradaProdutoPortalDTO) ?? null)
    setErro(null)
  }

  async function handleProximo() {
    if (step === 1) {
      if (!origemEmpresa) { setErro('Selecione a empresa de origem.'); return }
      if (!origemEstoque) { setErro('Selecione o estoque de origem.'); return }
      if (!origemProduto) { setErro('Selecione o produto de origem.'); return }
    } else if (step === 2) {
      if (!origemEntrada) { setErro('Selecione a entrada/lote.'); return }
      // Busca detalhes do produto de destino para controlar campos lote/validade
      if (destinoProduto) {
        setDestinoProdutoDetalheLoading(true)
        setDestinoProdutoDetalhe(null)
        setCdLote('')
        setDtValidade('')
        try {
          const detalhe = await buscarProdutoDetalhe(empresaId, destinoProduto.id)
          setDestinoProdutoDetalhe(detalhe)
        } catch {
          // não bloqueia a navegação; campos ficam ocultos
        } finally {
          setDestinoProdutoDetalheLoading(false)
        }
      }
    } else if (step === 3) {
      // Valida campos obrigatórios do step 3
      if (!quantidade || Number(quantidade) <= 0) { setErro('Informe a quantidade.'); return }
      if (!origemEntrada) { setErro('Selecione a entrada/lote.'); return }
      if (!origemEmpresa) { setErro('Empresa de origem não selecionada.'); return }
      // Salva como PENDENTE ao avançar para o step 4
      setSalvandoStep4(true)
      setErro(null)
      try {
        const saved = await salvarTransferencia(empresaId, {
          cdMultiEmpresa: origemEmpresa.id,
          cdEstoque:      origemEstoque!.id,
          dsEstoque:      origemEstoque!.label ?? null,
          cdProdutoDev:   origemProduto!.id,
          dsProdutoDev:   origemProduto!.label ?? null,
          cdEntPro:       origemEntrada.id,
          cdLoteDev:      origemEntradaDetails?.CD_LOTE ?? null,
          dtValidadeDev:  origemEntradaDetails?.DT_VALIDADE?.substring(0, 10) ?? null,
          qtDevolvida:    Number(quantidade),
          cdProdutoEnt:   destinoProduto?.id ?? origemProduto!.id,
          dsProdutoEnt:   destinoProduto?.label ?? origemProduto!.label ?? null,
          cdLoteEnt:      cdLote || null,
          dtValidadeEnt:  dtValidade || null,
          qtEntrada:      Number(quantidade),
          dtDevolucao:    new Date().toISOString().substring(0, 10),
        })
        setTransferenciaId(saved.id)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao salvar transferência.')
        setSalvandoStep4(false)
        return
      }
      setSalvandoStep4(false)
    }
    setErro(null)
    setStep(s => Math.min(s + 1, TOTAL_STEPS))
  }

  async function handleConcluir() {
    if (!transferenciaId) { setErro('Transferência não salva. Volte ao passo anterior.'); return }
    setShowConfirm(true)
  }

  async function confirmarConclusao() {
    if (!transferenciaId) return
    setShowConfirm(false)
    setErro(null)
    setSucesso(null)
    setConcluindo(true)
    try {
      await concluirTransferencia(empresaId, transferenciaId)
      setSucesso('Transferência concluída com sucesso!')
      setTransferenciaId(null)
      setTimeout(() => onConcluido?.(), 1200)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao concluir transferência.')
    } finally {
      setConcluindo(false)
    }
  }

  // -- Render -----------------------------------------------------------------

  return (
    <div className="card">
      <div className="card-p flex flex-col gap-5">

        {/* Modal de confirmacao */}
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
                  <button className="btn btn-gradient" onClick={confirmarConclusao}>
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="section-label">
          <ArrowUpDown size={12} />
          <span>Transferência de Saldo Consignado</span>
        </div>

        {/* ─ Indicador de progresso nomeado ─ */}
        <div className="flex items-start">
          {(['Origem & Destino', 'Entrada / Lote', 'Operação', 'Resumo'] as const).map((label, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={n} className={`flex items-center ${n < 4 ? 'flex-1' : ''}`}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-200"
                    style={{
                      background: done ? 'var(--success)' : active ? 'var(--brand)' : 'transparent',
                      color: done || active ? '#fff' : 'var(--text-muted)',
                      border: `2px solid ${done ? 'var(--success)' : active ? 'var(--brand)' : 'var(--d2b-border)'}`,
                    }}
                  >
                    {done ? <Check size={11} /> : n}
                  </div>
                  <span
                    className="text-[9px] font-semibold text-center leading-tight whitespace-nowrap hidden sm:block"
                    style={{ color: active ? 'var(--text-primary)' : done ? 'var(--success)' : 'var(--text-muted)' }}
                  >
                    {label}
                  </span>
                </div>
                {n < 4 && (
                  <div
                    className="flex-1 h-0.5 mx-2 mb-4 transition-all duration-300"
                    style={{ background: step > n ? 'var(--success)' : 'var(--d2b-border)' }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Alertas */}
        {sucesso && (
          <div className="alert alert-success">
            <CheckCircle2 size={14} />
            <span>{sucesso}</span>
          </div>
        )}
        {erro && (
          <div className="alert alert-danger">
            <AlertTriangle size={14} />
            <span>{erro}</span>
          </div>
        )}

        {/* --- STEP 1 - Origem + Destino ----------------------------------- */}
        {step === 1 && (
          <>
            <div className="flex flex-col gap-3">
              <SecaoLabel label="Origem" cor="var(--brand)" />
              <div className="rounded-xl p-4 flex flex-col gap-4" style={{ border: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CampoCombobox label="Empresa" value={origemEmpresa} onChange={handleSelecionarEmpresa} fetchPage={fetchEmpresas} placeholder="Selecione a empresa..." dropdownLabel="Multi-empresas" />
                  <CampoCombobox label="Estoque" value={origemEstoque} onChange={handleSelecionarEstoque} fetchPage={fetchEstoques} placeholder={origemEmpresa ? 'Selecione o estoque...' : 'Selecione a empresa primeiro'} disabled={!origemEmpresa} dropdownLabel="Estoques consignados" />
                </div>
                <CampoCombobox label="Produto" value={origemProduto} onChange={handleSelecionarProdutoOrigem} fetchPage={fetchProdutosOrigem} placeholder={origemEstoque ? 'Selecione o produto...' : 'Selecione o estoque primeiro'} disabled={!origemEstoque} dropdownLabel="Produtos consignados" />
                <div className="grid grid-cols-2 gap-4">
                  <SaldoField label="Unidade" value={origemUnidade} loading={origemSaldoLoading} active={!!origemProduto} />
                  <SaldoField label="Quantidade disponivel" value={origemQtd} loading={origemSaldoLoading} active={!!origemProduto} />
                </div>
              </div>
            </div>

            <Divider />

            <div className="flex flex-col gap-3">
              <SecaoLabel label="Destino" cor="var(--info)" />
              <div className="rounded-xl p-4 flex flex-col gap-4" style={{ border: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Estoque</label>
                  <div className="input-field" style={{ opacity: 0.6, cursor: 'not-allowed', minHeight: '2.375rem' }} title="Definido pelo estoque de origem">
                    <span className="text-sm flex-1" style={{ color: origemEstoque ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {origemEstoque ? origemEstoque.label : 'Definido pelo estoque de origem'}
                    </span>
                  </div>
                </div>
                <CampoCombobox label="Produto" value={destinoProduto} onChange={handleSelecionarProdutoDestino} fetchPage={fetchProdutosDestino} placeholder={origemEstoque ? 'Selecione o produto...' : 'Selecione o estoque de origem primeiro'} disabled={!origemEstoque} dropdownLabel="Produtos consignados" />
                <div className="grid grid-cols-2 gap-4">
                  <SaldoField label="Unidade" value={destinoUnidade} loading={destinoSaldoLoading} active={!!destinoProduto} />
                  <SaldoField label="Quantidade disponivel" value={destinoQtd} loading={destinoSaldoLoading} active={!!destinoProduto} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* --- STEP 2 - Selecionar Entrada / Lote -------------------------- */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <SecaoLabel label="Entrada / Lote" cor="#f59e0b" />

            <div className="rounded-xl p-3 flex flex-col gap-1" style={{ border: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Estoque: <strong style={{ color: 'var(--text-primary)' }}>{origemEstoque?.label}</strong></span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Produto: <strong style={{ color: 'var(--text-primary)' }}>{origemProduto?.label}</strong></span>
            </div>

            <div className="rounded-xl p-4 flex flex-col gap-4" style={{ border: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}>
              <CampoCombobox
                label="Entrada / Lote"
                value={origemEntrada}
                onChange={handleSelecionarEntrada}
                fetchPage={fetchEntradas}
                placeholder="Pesquise pelo numero da entrada ou fornecedor..."
                dropdownLabel="Entradas disponiveis"
              />
              {origemEntradaDetails && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  <InfoField label="Cod. Entrada" value={origemEntradaDetails.CD_ENT_PRO} />
                  <InfoField label="Cod. Fornecedor" value={String(origemEntradaDetails.CD_FORNECEDOR)} />
                  <InfoField label="Fornecedor" value={origemEntradaDetails.NM_FORNECEDOR} />
                  <InfoField label="Produto" value={origemEntradaDetails.DS_PRODUTO ?? '-'} />
                  {origemEntradaDetails.CD_LOTE && <InfoField label="Lote" value={origemEntradaDetails.CD_LOTE} />}
                  {origemEntradaDetails.DT_VALIDADE && <InfoField label="Validade" value={formatDate(origemEntradaDetails.DT_VALIDADE)} />}
                  <InfoField label="Data de Entrada" value={formatDate(origemEntradaDetails.DT_ENTRADA)} />
                  <InfoField label="Qtd. Disponivel" value={origemEntradaDetails.QT_DISPONIVEL != null ? String(origemEntradaDetails.QT_DISPONIVEL) : '-'} />
                  <InfoField label="Unidade" value={origemEntradaDetails.DS_UNIDADE ?? '-'} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- STEP 3 - Operacao ------------------------------------------- */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <SecaoLabel label="Operacao" cor="#22c55e" />

            {/* Dados da entrada selecionada */}
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Dados da Entrada</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <InfoField label="Cod. Entrada" value={origemEntradaDetails?.CD_ENT_PRO ?? '-'} />
                <InfoField label="Cod. Fornecedor" value={String(origemEntradaDetails?.CD_FORNECEDOR ?? '-')} />
                <InfoField label="Cod. Estoque" value={String(origemEstoque?.id ?? '-')} />
                <InfoField label="Cod. Produto" value={String(origemProduto?.id ?? '-')} />
                <InfoField label="Produto" value={origemEntradaDetails?.DS_PRODUTO ?? '-'} />
                {origemEntradaDetails?.CD_LOTE && <InfoField label="Lote" value={origemEntradaDetails.CD_LOTE} />}
                {origemEntradaDetails?.DT_VALIDADE && <InfoField label="Validade" value={formatDate(origemEntradaDetails.DT_VALIDADE)} />}
                <InfoField label="Data de Entrada" value={formatDate(origemEntradaDetails?.DT_ENTRADA)} />
                <InfoField label="Qtd. Disponivel" value={origemEntradaDetails?.QT_DISPONIVEL != null ? String(origemEntradaDetails.QT_DISPONIVEL) : '-'} />
                <InfoField label="Unidade" value={origemEntradaDetails?.DS_UNIDADE ?? '-'} />
              </div>
            </div>

            {/* Como lidar + Quantidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Operação</label>
                <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--d2b-border)' }}>
                  <button
                    type="button"
                    className="flex-1 px-3 py-2 text-sm font-medium transition-colors"
                    style={{
                      background: tipoMovimento === 'DEVOLUCAO' ? 'var(--brand)' : 'transparent',
                      color: tipoMovimento === 'DEVOLUCAO' ? '#fff' : 'var(--text-muted)',
                    }}
                    onClick={() => setTipoMovimento('DEVOLUCAO')}
                  >
                    Devolver ao fornecedor
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-3 py-2 text-sm font-medium transition-colors"
                    style={{
                      background: tipoMovimento === 'BAIXA' ? 'var(--brand)' : 'transparent',
                      color: tipoMovimento === 'BAIXA' ? '#fff' : 'var(--text-muted)',
                      borderLeft: '1px solid var(--d2b-border)',
                    }}
                    onClick={() => setTipoMovimento('BAIXA')}
                  >
                    Baixar
                  </button>
                </div>
              </div>
              <Campo label="Quantidade" value={quantidade} onChange={setQuantidade} type="number" placeholder="0" />
            </div>

            {/* Produto destino */}
            {destinoProduto && (
              <>
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px" style={{ background: 'var(--d2b-border)' }} />
                  <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Produto Destino</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--d2b-border)' }} />
                </div>
                <div className="rounded-xl p-4" style={{ border: '1px solid var(--info-border)', background: 'var(--info-muted)' }}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <InfoField label="Produto" value={destinoProduto.label} />
                    <InfoField label="Unidade" value={destinoUnidade || '-'} />
                    <InfoField label="Qtd. para troca" value={quantidade || '-'} />
                  </div>
                </div>

                {/* Campos lote / validade condicionais */}
                {destinoProdutoDetalheLoading && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Carregando detalhes do produto...</span>
                  </div>
                )}
                {!destinoProdutoDetalheLoading && destinoProdutoDetalhe && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {destinoProdutoDetalhe.SN_LOTE === 'S' && (
                      <Campo label="Lote (destino)" value={cdLote} onChange={setCdLote} placeholder="Informe o lote" />
                    )}
                    {destinoProdutoDetalhe.SN_CONTROLE_VALIDADE === 'S' && (
                      <Campo label="Validade (destino)" value={dtValidade} onChange={setDtValidade} type="date" />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* --- STEP 4 - Resumo ----------------------------------------------- */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <SecaoLabel label="Resumo da Transferência" cor="#a855f7" />

            {/* Card visual: fluxo de produtos */}
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
            >
              <div className="flex-1 min-w-0 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                  Produto de origem
                </div>
                <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {origemProduto?.label ?? '—'}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {origemEstoque?.label}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
                    border: '2px solid color-mix(in srgb, var(--brand) 30%, transparent)',
                  }}
                >
                  <ArrowRight size={18} style={{ color: 'var(--brand)' }} />
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>
                  {quantidade} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>un.</span>
                </span>
              </div>

              <div className="flex-1 min-w-0 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                  Produto de destino
                </div>
                <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {destinoProduto?.label ?? origemProduto?.label ?? '—'}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {origemEstoque?.label}
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Devolução (Saída)</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <InfoField label="Empresa" value={origemEmpresa?.label ?? '-'} />
                <InfoField label="Estoque" value={origemEstoque?.label ?? '-'} />
                <InfoField label="Cód. Produto" value={origemProduto ? String(origemProduto.id) : '-'} />
                <InfoField label="Produto (Dev.)" value={origemProduto?.label ?? '-'} />
                <InfoField label="Entrada" value={origemEntradaDetails ? String(origemEntradaDetails.CD_ENT_PRO) : (origemEntrada?.label ?? '-')} />
                {origemEntradaDetails?.CD_LOTE && <InfoField label="Lote" value={origemEntradaDetails.CD_LOTE} />}
                {origemEntradaDetails?.DT_VALIDADE && <InfoField label="Validade" value={formatDate(origemEntradaDetails.DT_VALIDADE)} />}
                <InfoField label="Quantidade" value={quantidade || '-'} />
              </div>
            </div>

            {destinoProduto && (
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid var(--info-border)', background: 'var(--info-muted)' }}>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Nova Entrada (Produto Destino)</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <InfoField label="Cód. Produto" value={String(destinoProduto.id)} />
                  <InfoField label="Produto (Ent.)" value={destinoProduto.label} />
                  {cdLote && <InfoField label="Lote" value={cdLote} />}
                  {dtValidade && <InfoField label="Validade" value={formatDate(dtValidade)} />}
                  <InfoField label="Quantidade" value={quantidade || '-'} />
                </div>
              </div>
            )}

            {!sucesso && (
              <div className="rounded-xl p-3" style={{ border: '1px solid var(--warning-border)', background: 'var(--warning-muted)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
                  Clique em Concluir para confirmar a operação no sistema MV.
                </span>
              </div>
            )}
          </div>
        )}

        {/* --- Footer --- */}
        <div className="flex items-center justify-between pt-1">

          {/* Voltar */}
          {onVoltar && step === 1 ? (
            <button className="btn" style={{ opacity: 0.7 }} onClick={onVoltar} disabled={concluindo || salvandoStep4}>
              <ChevronLeft size={14} />
              Voltar
            </button>
          ) : (
            <button
              className="btn"
              style={{ visibility: step > 1 && !sucesso ? 'visible' : 'hidden', opacity: 0.7 }}
              onClick={() => { setErro(null); setStep(s => s - 1) }}
              disabled={concluindo || salvandoStep4}
            >
              <ChevronLeft size={14} />
              Voltar
            </button>
          )}

          {/* Contador de etapas */}
          <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
            Etapa {step} de {TOTAL_STEPS}
          </span>

          {/* Proximo / Concluir */}
          <button
            className="btn btn-gradient"
            onClick={step < TOTAL_STEPS ? handleProximo : handleConcluir}
            disabled={concluindo || salvandoStep4 || !!sucesso}
          >
            {(concluindo || salvandoStep4) ? (
              <><Loader2 size={14} className="animate-spin" /> {salvandoStep4 ? 'Salvando...' : 'Registrando...'}</>
            ) : step < TOTAL_STEPS ? (
              'Proximo'
            ) : (
              'Concluir'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
