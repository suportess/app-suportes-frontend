'use client'

import { useState, useEffect, useMemo } from 'react'
import { Package, AlertTriangle, Loader2, X, Plus, Trash2 } from 'lucide-react'
import type { ProdutoConsignadoPortalDTO, ProdutoDetalhePortalDTO, FornecedorPortalDTO } from '@/lib/types'
import { buscarProdutoDetalhe } from '../../actions'
import { fmtQtd, CampoLabel, Combobox, Tooltip, type Item, type FornecedorLinha } from './sc-shared'

export function TransferirProdutoModal({
  produto,
  saldoTotal,
  saldoDisponivel,
  empresaId,
  fornecedores,
  loadingFornecedores,
  onConfirmar,
  onFechar,
  initialLinhas,
}: {
  produto: ProdutoConsignadoPortalDTO
  saldoTotal: number
  saldoDisponivel: number
  empresaId: number
  fornecedores: FornecedorPortalDTO[]
  loadingFornecedores: boolean
  onConfirmar: (linhas: FornecedorLinha[], snLote: 'S' | 'N', snValidade: 'S' | 'N') => void
  onFechar: () => void
  initialLinhas?: FornecedorLinha[]
}) {
  const [detalhe, setDetalhe]               = useState<ProdutoDetalhePortalDTO | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(true)
  const [fornItem, setFornItem]             = useState<Item | null>(null)
  const [linhas, setLinhas]                 = useState<FornecedorLinha[]>(initialLinhas ?? [])
  const [erro, setErro]                     = useState<string | null>(null)

  useEffect(() => {
    buscarProdutoDetalhe(empresaId, Number(produto.CD_PRODUTO))
      .then(setDetalhe).catch(() => setDetalhe(null)).finally(() => setLoadingDetalhe(false))
  }, [empresaId, produto.CD_PRODUTO])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  const snLote     = detalhe?.SN_LOTE ?? 'N'
  const snValidade = detalhe?.SN_CONTROLE_VALIDADE ?? 'N'

  const qtdDistribuida = useMemo(
    () => linhas.reduce((acc, l) => acc + (parseFloat(l.quantidade.replace(',', '.')) || 0), 0),
    [linhas],
  )

  const restante = Math.max(0, saldoDisponivel - qtdDistribuida)

  const fornOpts: Item[] = fornecedores
    .filter(f => !linhas.some(l => l.fornecedor.CD_FORNECEDOR === f.CD_FORNECEDOR))
    .map(f => ({ id: f.CD_FORNECEDOR, label: f.NM_FORNECEDOR }))

  function handleAdicionarForn() {
    if (!fornItem) return
    const found = fornecedores.find(f => String(f.CD_FORNECEDOR) === String(fornItem.id))
    if (!found) return
    const maxDisponivelParaLinha = Math.max(0, saldoDisponivel - qtdDistribuida)
    setLinhas(prev => [
      ...prev,
      {
        fornecedor: found,
        quantidade: maxDisponivelParaLinha > 0 ? String(maxDisponivelParaLinha) : '',
        lote: 'LOTE-MIGRACAO-SALDO',
        validade: '01/01/2050',
      },
    ])
    setFornItem(null)
    setErro(null)
  }

  function handleEditLinha(cdForn: number, field: 'quantidade' | 'lote' | 'validade', value: string) {
    setLinhas(prev => prev.map(l => l.fornecedor.CD_FORNECEDOR === cdForn ? { ...l, [field]: value } : l))
    setErro(null)
  }

  function handleRemoverLinha(cdForn: number) {
    setLinhas(prev => prev.filter(l => l.fornecedor.CD_FORNECEDOR !== cdForn))
  }

  function handleConfirmar() {
    if (linhas.length === 0) { setErro('Adicione ao menos um fornecedor.'); return }
    const invalid = linhas.some(l => { const q = parseFloat(l.quantidade.replace(',', '.')); return isNaN(q) || q <= 0 })
    if (invalid) { setErro('Todas as quantidades devem ser maiores que zero.'); return }
    if (qtdDistribuida > saldoDisponivel) {
      setErro(`Total distribuído (${fmtQtd(qtdDistribuida)}) excede o disponível (${fmtQtd(saldoDisponivel)}).`)
      return
    }
    onConfirmar(linhas, snLote, snValidade)
  }

  const todasValidas = linhas.length > 0
    && linhas.every(l => { const q = parseFloat(l.quantidade.replace(',', '.')); return !isNaN(q) && q > 0 })
    && qtdDistribuida <= saldoDisponivel

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="rounded shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--d2b-border)', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--d2b-border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: 'var(--brand-muted)' }}>
              <Package size={15} style={{ color: 'var(--brand)' }} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{produto.DS_PRODUTO}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cód. {produto.CD_PRODUTO}</span>
                {loadingDetalhe
                  ? <Loader2 size={10} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                  : (
                    <>
                      <Tooltip text={snLote === 'S' ? 'Controla lote — coluna habilitada' : 'Não controla lote'}>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm cursor-default"
                          style={{
                            background: snLote === 'S' ? 'var(--brand-muted)' : 'var(--bg-elevated)',
                            color: snLote === 'S' ? 'var(--brand)' : 'var(--text-muted)',
                            border: `1px solid ${snLote === 'S' ? 'var(--brand)' : 'var(--d2b-border)'}44`,
                          }}
                        >
                          Lote: {snLote === 'S' ? 'Sim' : 'Não'}
                        </span>
                      </Tooltip>
                      <Tooltip text={snValidade === 'S' ? 'Controla validade — coluna habilitada' : 'Não controla validade — campo desabilitado'}>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm cursor-default"
                          style={{
                            background: snValidade === 'S' ? 'var(--brand-muted)' : 'var(--bg-elevated)',
                            color: snValidade === 'S' ? 'var(--brand)' : 'var(--text-muted)',
                            border: `1px solid ${snValidade === 'S' ? 'var(--brand)' : 'var(--d2b-border)'}44`,
                          }}
                        >
                          Validade: {snValidade === 'S' ? 'Sim' : 'Não'}
                        </span>
                      </Tooltip>
                    </>
                  )
                }
              </div>
            </div>
          </div>
          <button onClick={onFechar} className="icon-btn" style={{ width: '1.75rem', height: '1.75rem' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

          {/* Cards de saldo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <CampoLabel label="Disponível para distribuir" />
              <div className="input-field flex items-center" style={{ minHeight: '2.375rem', cursor: 'default', userSelect: 'none' }}>
                <span className="font-mono font-bold text-sm" style={{ color: 'var(--success)' }}>{fmtQtd(saldoDisponivel)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <CampoLabel label="Distribuído" />
              <div className="input-field flex items-center" style={{ minHeight: '2.375rem', cursor: 'default', userSelect: 'none' }}>
                <span className="font-mono font-bold text-sm" style={{ color: qtdDistribuida > 0 ? 'var(--warning, #f59e0b)' : 'var(--text-muted)' }}>
                  {fmtQtd(qtdDistribuida)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <CampoLabel label="Restante" />
              <div
                className="input-field flex items-center"
                style={{ minHeight: '2.375rem', cursor: 'default', userSelect: 'none', borderColor: qtdDistribuida > saldoDisponivel ? 'var(--danger, #ef4444)' : undefined }}
              >
                <span className="font-mono font-bold text-sm" style={{ color: qtdDistribuida > saldoDisponivel ? 'var(--danger, #ef4444)' : restante > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {fmtQtd(restante)}
                </span>
              </div>
            </div>
          </div>

          {/* Autocomplete fornecedor */}
          <div className="flex flex-col gap-1">
            <CampoLabel label="Adicionar fornecedor" />
            <div className="flex gap-2 items-stretch">
              <div className="flex-1 min-w-0">
                {loadingFornecedores ? (
                  <div className="input-field flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)', minHeight: '2.375rem' }}>
                    <Loader2 size={12} className="animate-spin" /> Carregando fornecedores...
                  </div>
                ) : (
                  <Combobox
                    value={fornItem}
                    onChange={setFornItem}
                    onConfirm={handleAdicionarForn}
                    placeholder={fornOpts.length === 0 ? 'Todos os fornecedores já adicionados' : 'Buscar fornecedor...'}
                    disabled={fornOpts.length === 0}
                    items={fornOpts}
                  />
                )}
              </div>
              <button
                className="btn btn-gradient flex items-center justify-center flex-shrink-0"
                onClick={handleAdicionarForn}
                disabled={!fornItem}
                title="Adicionar fornecedor"
                style={{ width: '2.375rem', height: '2.375rem', padding: 0 }}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Tabela de fornecedores */}
          {linhas.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 py-8 rounded-sm"
              style={{ border: '1px dashed var(--d2b-border)', color: 'var(--text-muted)' }}
            >
              <Package size={22} className="opacity-30" />
              <span className="text-xs">Selecione um fornecedor acima e clique em + para adicionar</span>
            </div>
          ) : (
            <div className="rounded-sm overflow-hidden" style={{ border: '1px solid var(--d2b-border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--d2b-border)' }}>
                    <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Fornecedor</th>
                    <th className="py-2.5 px-2 font-semibold uppercase tracking-wide text-right w-48" style={{ color: 'var(--text-muted)' }}>Quantidade</th>
                    {snLote === 'S' && (
                      <th className="py-2.5 px-2 font-semibold uppercase tracking-wide text-left w-48" style={{ color: 'var(--text-muted)' }}>Lote</th>
                    )}
                    <th className="py-2.5 px-2 font-semibold uppercase tracking-wide text-left w-40" style={{ color: 'var(--text-muted)' }}>
                      Validade
                      {snValidade === 'N' && <span className="ml-1 font-normal normal-case tracking-normal opacity-60">(sem controle)</span>}
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha, idx) => {
                    const q = parseFloat(linha.quantidade.replace(',', '.'))
                    const qtdOk = !isNaN(q) && q > 0
                    const restanteComEstaLinha = Math.max(0, saldoDisponivel - qtdDistribuida + (qtdOk ? q : 0))
                    return (
                      <tr
                        key={linha.fornecedor.CD_FORNECEDOR}
                        style={{
                          borderBottom: idx < linhas.length - 1 ? '1px solid var(--d2b-border)' : undefined,
                          background: idx % 2 === 1 ? 'var(--d2b-hover)' : 'transparent',
                        }}
                      >
                        {/* Fornecedor */}
                        <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{linha.fornecedor.NM_FORNECEDOR}</span>
                            <span style={{ color: 'var(--text-muted)' }}>Cód. {linha.fornecedor.CD_FORNECEDOR}</span>
                          </div>
                        </td>
                        {/* Quantidade — input + botão Máx lado a lado */}
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={linha.quantidade}
                              onChange={e => handleEditLinha(linha.fornecedor.CD_FORNECEDOR, 'quantidade', e.target.value)}
                              placeholder="0"
                              className="input-field w-full text-right text-xs"
                              style={{
                                minHeight: '1.9rem',
                                fontFamily: 'var(--font-mono, monospace)',
                                borderColor: linha.quantidade && !qtdOk ? 'var(--danger, #ef4444)' : undefined,
                              }}
                            />
                            {restanteComEstaLinha > 0 && (
                              <button
                                type="button"
                                onClick={() => handleEditLinha(linha.fornecedor.CD_FORNECEDOR, 'quantidade', String(restanteComEstaLinha))}
                                className="text-[9px] font-bold px-1.5 py-1 rounded-sm whitespace-nowrap flex-shrink-0"
                                style={{ background: 'var(--brand-muted)', color: 'var(--brand)', border: '1px solid var(--brand)44', minHeight: '1.9rem' }}
                              >
                                Máx
                              </button>
                            )}
                          </div>
                        </td>
                        {/* Lote */}
                        {snLote === 'S' && (
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={linha.lote}
                              onChange={e => handleEditLinha(linha.fornecedor.CD_FORNECEDOR, 'lote', e.target.value)}
                              placeholder="LOTE-MIGRACAO-SALDO"
                              className="input-field w-full text-xs"
                              style={{ minHeight: '1.9rem', fontFamily: 'var(--font-mono, monospace)' }}
                            />
                          </td>
                        )}
                        {/* Validade — sempre visível, desabilitado se sem controle */}
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={linha.validade}
                            onChange={e => handleEditLinha(linha.fornecedor.CD_FORNECEDOR, 'validade', e.target.value)}
                            placeholder="01/01/2050"
                            disabled={snValidade === 'N'}
                            className="input-field w-full text-xs"
                            style={{
                              minHeight: '1.9rem',
                              fontFamily: 'var(--font-mono, monospace)',
                              opacity: snValidade === 'N' ? 0.45 : 1,
                              cursor: snValidade === 'N' ? 'not-allowed' : 'text',
                            }}
                          />
                        </td>
                        {/* Remover */}
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleRemoverLinha(linha.fornecedor.CD_FORNECEDOR)}
                            className="opacity-40 hover:opacity-100 transition-opacity p-1"
                            style={{ color: 'var(--danger, #ef4444)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {erro && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--danger, #ef4444)' }}>
              <AlertTriangle size={12} /> {erro}
            </div>
          )}

        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}
        >
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {linhas.length === 0
              ? 'Adicione ao menos um fornecedor'
              : `${linhas.length} fornecedor${linhas.length !== 1 ? 'es' : ''} · total ${fmtQtd(qtdDistribuida)}`}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn" onClick={onFechar}>Cancelar</button>
            <button
              className="btn btn-gradient flex items-center gap-1.5"
              onClick={handleConfirmar}
              disabled={!todasValidas}
            >
              <Plus size={13} /> Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
