'use client'

import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, ChevronRight, Plus, Package, Trash2, Info, AlertTriangle } from 'lucide-react'
import type { SaldoProdutoConsignadoPortalDTO, ProdutoConsignadoPortalDTO, FornecedorPortalDTO } from '@/lib/types'
import { listarTodosProdutosConsignados, listarFornecedores, salvarOperacaoBaixa, atualizarOperacaoBaixa } from '../../actions'
import { toast } from 'sonner'
import { fmtQtd, CampoLabel, Combobox, Tooltip, type Item, type FornecedorLinha, type ItemAdicionado } from './sc-shared'
import { TransferirProdutoModal } from './sc-modal-transferir'
import { ResumoView } from './sc-resumo-view'

export function BaixaConsignadosView({
  estoque,
  selecionados,
  empresaId,
  cdMultiEmpresa,
  editandoId,
  initialAdicionados,
  onVoltar,
  onConcluir,
}: {
  estoque: Item
  selecionados: SaldoProdutoConsignadoPortalDTO[]
  empresaId: number
  cdMultiEmpresa: number
  editandoId?: number | null
  initialAdicionados?: ItemAdicionado[]
  onVoltar: () => void
  onConcluir?: () => void
}) {
  const [todosProdutos, setTodosProdutos] = useState<ProdutoConsignadoPortalDTO[]>([])
  const [loadingTodos, setLoadingTodos]   = useState(true)
  const [fornecedores, setFornecedores]   = useState<FornecedorPortalDTO[]>([])
  const [loadingForn, setLoadingForn]     = useState(true)
  const [produto, setProduto]             = useState<Item | null>(null)
  const [adicionados, setAdicionados]     = useState<ItemAdicionado[]>(initialAdicionados ?? [])
  const [modalProduto, setModalProduto]   = useState<ProdutoConsignadoPortalDTO | null>(null)
  const [modalEditandoIdx, setModalEditandoIdx] = useState<number | null>(null)
  const [subPasso, setSubPasso]           = useState<'distribuir' | 'resumo'>('distribuir')
  const [operacaoId, setOperacaoId]       = useState<number | null>(null)
  const [salvando, setSalvando]           = useState(false)

  useEffect(() => {
    listarTodosProdutosConsignados(empresaId)
      .then(setTodosProdutos).catch(() => setTodosProdutos([]))
      .finally(() => setLoadingTodos(false))
    listarFornecedores(empresaId)
      .then(setFornecedores).catch(() => setFornecedores([]))
      .finally(() => setLoadingForn(false))
  }, [empresaId])

  const saldoTotal = useMemo(
    () => selecionados.reduce((acc, s) => acc + (Number(s.QT_ESTOQUE_ATUAL) || 0), 0),
    [selecionados],
  )

  const saldoAlocado = useMemo(
    () => adicionados.reduce(
      (acc, a) => acc + a.linhas.reduce((s, l) => s + (parseFloat(l.quantidade.replace(',', '.')) || 0), 0),
      0,
    ),
    [adicionados],
  )

  const saldoDisponivel = Math.max(0, saldoTotal - saldoAlocado)

  const produtoOpts: Item[] = todosProdutos
    .filter(p => !adicionados.some(a => a.produto.CD_PRODUTO === p.CD_PRODUTO))
    .map(p => ({ id: p.CD_PRODUTO, label: p.DS_PRODUTO }))

  function handleAbrirModal() {
    if (!produto) return
    const found = todosProdutos.find(p => String(p.CD_PRODUTO) === String(produto.id))
    if (!found) return
    setModalProduto(found)
  }

  function handleEditarAdicionado(idx: number) {
    const item = adicionados[idx]
    setModalProduto(item.produto)
    setModalEditandoIdx(idx)
  }

  function handleConfirmarModal(linhas: FornecedorLinha[], snLote: 'S' | 'N', snValidade: 'S' | 'N') {
    if (!modalProduto) return
    if (modalEditandoIdx !== null) {
      setAdicionados(prev => prev.map((a, i) => i === modalEditandoIdx ? { ...a, linhas, snLote, snValidade } : a))
    } else {
      setAdicionados(prev => [...prev, { produto: modalProduto, snLote, snValidade, linhas }])
    }
    setModalProduto(null)
    setModalEditandoIdx(null)
    setProduto(null)
  }

  function handleRemover(cdProduto: string) {
    setAdicionados(prev => prev.filter(a => a.produto.CD_PRODUTO !== cdProduto))
    if (modalProduto?.CD_PRODUTO === cdProduto) { setModalProduto(null); setModalEditandoIdx(null) }
  }

  async function handleVerResumo() {
    if (adicionados.length === 0) return
    if (saldoAlocado > saldoTotal) {
      toast.error('Quantidade alocada excede o saldo total', {
        description: `Alocado: ${fmtQtd(saldoAlocado)} — Total disponível: ${fmtQtd(saldoTotal)}. Reduza as quantidades antes de continuar.`,
      })
      return
    }
    setSalvando(true)
    try {
      const req = {
        cdMultiEmpresa,
        cdEstoque: Number(estoque.id),
        dsEstoque: estoque.label,
        origens: selecionados.map(s => ({
          cdProduto: Number(s.CD_PRODUTO),
          dsProduto: s.DS_PRODUTO,
          qtEstoqueAtual: s.QT_ESTOQUE_ATUAL,
        })),
        itens: adicionados.map(a => ({
          cdProduto: Number(a.produto.CD_PRODUTO),
          dsProduto: a.produto.DS_PRODUTO,
          snLote: a.snLote,
          snValidade: a.snValidade,
          linhas: a.linhas.map(l => ({
            cdFornecedor: Number(l.fornecedor.CD_FORNECEDOR),
            nmFornecedor: l.fornecedor.NM_FORNECEDOR,
            quantidade: parseFloat(l.quantidade.replace(',', '.')) || 0,
            lote: l.lote,
            validade: l.validade,
          })),
        })),
      }
      const saved = editandoId
        ? await atualizarOperacaoBaixa(empresaId, editandoId, req)
        : await salvarOperacaoBaixa(empresaId, req)
      setOperacaoId(saved.id)
      setSubPasso('resumo')
    } catch (err) {
      console.error('Erro ao salvar operação:', err)
    } finally {
      setSalvando(false)
    }
  }

  if (subPasso === 'resumo') {
    return (
      <ResumoView
        estoque={estoque}
        selecionados={selecionados}
        adicionados={adicionados}
        saldoTotal={saldoTotal}
        saldoAlocado={saldoAlocado}
        operacaoId={operacaoId}
        onVoltar={() => setSubPasso('distribuir')}
        onConcluir={() => onConcluir?.()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Stepper */}
      <div className="flex items-center gap-3">
        <button onClick={onVoltar} className="btn flex items-center gap-1.5">
          <ArrowLeft size={13} />
          Voltar
        </button>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Etapa 1</span>
          <ChevronRight size={11} />
          <span className="font-semibold" style={{ color: 'var(--brand)' }}>Etapa 2</span>
        </div>
      </div>

      {/* Card principal */}
      <div className="card">
        <div className="card-p flex flex-col gap-3">

          {/* Linha 1: Estoque | Produto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            <div className="flex flex-col gap-1">
              <CampoLabel label="Estoque" />
              <div
                className="input-field flex items-center"
                style={{ minHeight: '2.375rem', opacity: 0.7, cursor: 'not-allowed', userSelect: 'none' }}
              >
                <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{estoque.label}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <CampoLabel label="Produto de destino" />
              <div className="flex gap-2 items-stretch">
                <div className="flex-1 min-w-0">
                  <Combobox
                    value={produto}
                    onChange={setProduto}
                    onConfirm={handleAbrirModal}
                    placeholder={
                      loadingTodos ? 'Carregando produtos...'
                      : saldoDisponivel <= 0 ? 'Sem saldo disponível'
                      : 'Buscar produto consignado...'
                    }
                    disabled={loadingTodos || todosProdutos.length === 0 || saldoDisponivel <= 0}
                    items={produtoOpts}
                    loading={loadingTodos}
                  />
                </div>
                <button
                  className="btn btn-gradient flex items-center justify-center flex-shrink-0"
                  onClick={handleAbrirModal}
                  disabled={!produto || saldoDisponivel <= 0}
                  title={saldoDisponivel <= 0 ? 'Sem saldo disponível' : 'Informar fornecedor e quantidade'}
                  style={{ width: '2.375rem', height: '2.375rem', padding: 0 }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

          </div>

          {/* Linha 2: Saldo Total | Alocado | Disponível */}
          <div className="grid grid-cols-3 gap-3">

            <div className="flex flex-col gap-1">
              <CampoLabel label="Saldo Total" />
              <div
                className="input-field flex items-center"
                style={{ minHeight: '2.375rem', cursor: 'default', userSelect: 'none' }}
              >
                <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {fmtQtd(saldoTotal)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Tooltip text="Total já alocado nos produtos adicionados abaixo">
                <CampoLabel label="Alocado" />
              </Tooltip>
              <div
                className="input-field flex items-center"
                style={{ minHeight: '2.375rem', cursor: 'default', userSelect: 'none' }}
              >
                <span
                  className="font-mono font-bold text-sm"
                  style={{ color: saldoAlocado > 0 ? 'var(--warning, #f59e0b)' : 'var(--text-muted)' }}
                >
                  {fmtQtd(saldoAlocado)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <CampoLabel label="Disponível" />
              <div
                className="input-field flex items-center"
                style={{
                  minHeight: '2.375rem', cursor: 'default', userSelect: 'none',
                  borderColor: saldoDisponivel <= 0 && saldoTotal > 0 ? 'var(--danger, #ef4444)' : undefined,
                }}
              >
                <span
                  className="font-mono font-bold text-sm"
                  style={{
                    color: saldoDisponivel > 0 ? 'var(--success)'
                      : saldoTotal > 0 ? 'var(--danger, #ef4444)'
                      : 'var(--text-muted)',
                  }}
                >
                  {fmtQtd(saldoDisponivel)}
                </span>
              </div>
            </div>

          </div>

          {saldoDisponivel <= 0 && saldoTotal > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--warning, #f59e0b)' }}>
              <AlertTriangle size={12} />
              Todo o saldo disponível foi alocado nos produtos abaixo.
            </div>
          )}

          {saldoAlocado > saldoTotal && saldoTotal > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--danger, #ef4444)' }}>
              <AlertTriangle size={12} />
              A quantidade alocada ({fmtQtd(saldoAlocado)}) ultrapassa o saldo total ({fmtQtd(saldoTotal)}). Reduza as quantidades antes de continuar.
            </div>
          )}

        </div>
      </div>

      {/* Tabela de itens adicionados */}
      {adicionados.length > 0 && (
        <div className="card">
          <div className="card-p flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="section-label">
                <Package size={12} />
                <span>{adicionados.length} produto{adicionados.length !== 1 ? 's' : ''} para transferir</span>
              </div>
              <button
                className="btn btn-gradient flex items-center gap-1.5"
                onClick={handleVerResumo}
                disabled={salvando || adicionados.length === 0}
              >
                Ver resumo
                <ChevronRight size={12} />
              </button>
            </div>
            <div className="overflow-x-auto rounded-sm" style={{ border: '1px solid var(--d2b-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--d2b-border)' }}>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      Produto
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      Fornecedores
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wide w-28" style={{ color: 'var(--text-muted)' }}>
                      Qtd Total
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {adicionados.map((item, idx) => {
                    const qtdTotal = item.linhas.reduce(
                      (s, l) => s + (parseFloat(l.quantidade.replace(',', '.')) || 0), 0,
                    )
                    return (
                      <tr
                        key={item.produto.CD_PRODUTO + '-' + idx}
                        onClick={() => handleEditarAdicionado(idx)}
                        title="Clique para editar fornecedores e quantidades"
                        style={{
                          borderBottom: '1px solid var(--d2b-border)',
                          background: idx % 2 === 1 ? 'var(--d2b-hover)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-muted)')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 1 ? 'var(--d2b-hover)' : 'transparent')}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                              {item.produto.DS_PRODUTO}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cód. {item.produto.CD_PRODUTO}</span>
                              {item.snLote === 'S' && (
                                <span className="text-[10px] px-1 py-0.5 rounded-sm" style={{ background: 'var(--brand-muted)', color: 'var(--brand)' }}>
                                  Lote
                                </span>
                              )}
                              {item.snValidade === 'S' && (
                                <span className="text-[10px] px-1 py-0.5 rounded-sm" style={{ background: 'var(--brand-muted)', color: 'var(--brand)' }}>
                                  Validade
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {item.linhas.slice(0, 3).map(l => (
                              <span
                                key={l.fornecedor.CD_FORNECEDOR}
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm"
                                style={{ background: 'var(--brand-muted)', color: 'var(--brand)' }}
                              >
                                {l.fornecedor.NM_FORNECEDOR}
                              </span>
                            ))}
                            {item.linhas.length > 3 && (
                              <Tooltip text={item.linhas.slice(3).map(l => l.fornecedor.NM_FORNECEDOR).join(', ')}>
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm cursor-default flex items-center gap-0.5"
                                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--d2b-border)' }}
                                >
                                  +{item.linhas.length - 3} <Info size={8} />
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-sm" style={{ color: 'var(--brand)' }}>
                          {fmtQtd(qtdTotal)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={e => { e.stopPropagation(); handleRemover(item.produto.CD_PRODUTO) }}
                            title="Remover produto"
                            className="opacity-40 hover:opacity-100 transition-opacity p-1"
                            style={{ color: 'var(--danger, #ef4444)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalProduto && (
        <TransferirProdutoModal
          produto={modalProduto}
          saldoTotal={saldoTotal}
          saldoDisponivel={
            modalEditandoIdx !== null
              ? saldoDisponivel + adicionados[modalEditandoIdx].linhas.reduce(
                  (s, l) => s + (parseFloat(l.quantidade.replace(',', '.')) || 0), 0,
                )
              : saldoDisponivel
          }
          empresaId={empresaId}
          fornecedores={fornecedores}
          loadingFornecedores={loadingForn}
          onConfirmar={handleConfirmarModal}
          onFechar={() => { setModalProduto(null); setModalEditandoIdx(null) }}
          initialLinhas={modalEditandoIdx !== null ? adicionados[modalEditandoIdx].linhas : undefined}
        />
      )}

    </div>
  )
}
