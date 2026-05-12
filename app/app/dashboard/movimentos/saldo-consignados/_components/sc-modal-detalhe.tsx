'use client'

import { useState, useEffect, useMemo } from 'react'
import { Package, Loader2, X, Plus, Info, CheckSquare, Square, Search } from 'lucide-react'
import type { SaldoProdutoConsignadoPortalDTO, ProdutoDetalhePortalDTO, SaldoConsigFornPortalDTO } from '@/lib/types'
import { fmtQtd, Tooltip, ACAO_CONFIG } from './sc-shared'

export function ProdutoDetalheModal({
  saldo,
  detalhe,
  loadingDetalhe,
  saldoConsigForn,
  loadingSaldoConsigForn,
  savedAcoes,
  onAcoesChange,
  onConfirmar,
  onFechar,
}: {
  saldo: SaldoProdutoConsignadoPortalDTO
  detalhe: ProdutoDetalhePortalDTO | null
  loadingDetalhe: boolean
  saldoConsigForn: SaldoConsigFornPortalDTO[]
  loadingSaldoConsigForn: boolean
  savedAcoes: Record<number, string>
  onAcoesChange: (acoes: Record<number, string>) => void
  onConfirmar: () => void
  onFechar: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  const [busca, setBusca] = useState('')
  const [acoes, setAcoes] = useState<Record<number, string>>(() => savedAcoes)

  // Quando fornecedores carregam: preserva acoes salvas, DEVOLVER para novos
  useEffect(() => {
    if (saldoConsigForn.length > 0) {
      setAcoes(
        Object.fromEntries(
          saldoConsigForn.map(r => [
            r.CD_FORNECEDOR,
            savedAcoes[r.CD_FORNECEDOR] ?? 'DEVOLVER',
          ])
        )
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saldoConsigForn])

  // Propaga mudanças para o pai
  useEffect(() => {
    onAcoesChange(acoes)
  }, [acoes, onAcoesChange])

  const fornFiltrados = saldoConsigForn.filter(row =>
    row.NM_FORNECEDOR.toLowerCase().includes(busca.toLowerCase()) ||
    String(row.CD_FORNECEDOR).includes(busca)
  )

  function setAcao(cdFornecedor: number, acao: string) {
    setAcoes(prev => ({ ...prev, [cdFornecedor]: acao }))
  }

  function aplicarParaTodos(acao: string) {
    setAcoes(Object.fromEntries(saldoConsigForn.map(r => [r.CD_FORNECEDOR, acao])))
  }

  function limparTodos() {
    setAcoes({})
  }

  const resumo = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.values(acoes).forEach(a => { if (a) counts[a] = (counts[a] ?? 0) + 1 })
    return counts
  }, [acoes])

  const totalComAcao = Object.values(acoes).filter(Boolean).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="rounded shadow-2xl w-full max-w-6xl flex flex-col"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--d2b-border)', maxHeight: '92vh' }}
      >

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--d2b-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--success-muted)' }}
            >
              <Package size={15} style={{ color: 'var(--success)' }} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {saldo.DS_PRODUTO}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Código {saldo.CD_PRODUTO}
              </span>
            </div>
          </div>
          <button onClick={onFechar} className="icon-btn" style={{ width: '1.75rem', height: '1.75rem' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body (scrollável) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Cartões de saldo + unidade + flags */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              className="flex flex-col gap-0.5 px-4 py-3 rounded-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Saldo Total
              </span>
              <span
                className="text-2xl font-bold font-mono leading-none"
                style={{ color: Number(saldo.QT_ESTOQUE_ATUAL) > 0 ? 'var(--success)' : 'var(--text-muted)' }}
              >
                {fmtQtd(saldo.QT_ESTOQUE_ATUAL)}
              </span>
            </div>
            <div
              className="flex flex-col gap-0.5 px-4 py-3 rounded-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Unidade
              </span>
              <span className="text-lg font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
                {saldo.DS_UNI_PRO ?? '-'}
              </span>
            </div>
            {loadingDetalhe ? (
              <div className="col-span-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <Loader2 size={13} className="animate-spin" />
                <span className="text-xs">Carregando detalhes...</span>
              </div>
            ) : detalhe ? (
              <>
                <Tooltip text="Controla lote no sistema MV">
                  <div
                    className="flex flex-col gap-0.5 px-4 py-3 rounded-sm cursor-default w-full"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      Lote <Info size={9} />
                    </span>
                    <span className="text-sm font-semibold" style={{ color: detalhe.SN_LOTE === 'S' ? 'var(--brand)' : 'var(--text-muted)' }}>
                      {detalhe.SN_LOTE === 'S' ? 'Sim' : 'Não'}
                    </span>
                  </div>
                </Tooltip>
                <Tooltip text="Controla data de validade no sistema MV">
                  <div
                    className="flex flex-col gap-0.5 px-4 py-3 rounded-sm cursor-default w-full"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      Validade <Info size={9} />
                    </span>
                    <span className="text-sm font-semibold" style={{ color: detalhe.SN_CONTROLE_VALIDADE === 'S' ? 'var(--brand)' : 'var(--text-muted)' }}>
                      {detalhe.SN_CONTROLE_VALIDADE === 'S' ? 'Sim' : 'Não'}
                    </span>
                  </div>
                </Tooltip>
              </>
            ) : null}
          </div>

          {/* Seção de fornecedores */}
          <div className="flex flex-col gap-3">

            {/* Cabeçalho da seção */}
            <div
              className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 rounded-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                  Saldo por Fornecedor
                </span>
                {!loadingSaldoConsigForn && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm"
                    style={{ background: 'var(--brand-muted)', color: 'var(--brand)' }}
                  >
                    {saldoConsigForn.length} fornecedor{saldoConsigForn.length !== 1 ? 'es' : ''}
                  </span>
                )}
                {totalComAcao > 0 && (
                  <Tooltip text={`${Object.entries(resumo).map(([a, n]) => `${n} ${ACAO_CONFIG[a]?.label ?? a}`).join(' · ')}`}>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 cursor-default"
                      style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
                    >
                      <CheckSquare size={10} />
                      {totalComAcao} com ação <Info size={9} />
                    </span>
                  </Tooltip>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Aplicar para todos */}
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Todos:</span>
                {Object.entries(ACAO_CONFIG).map(([key, cfg]) => (
                  <Tooltip key={key} text={cfg.desc}>
                    <button
                      type="button"
                      onClick={() => aplicarParaTodos(key)}
                      className="text-[10px] font-semibold px-2 py-1 rounded-sm transition-opacity hover:opacity-80"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}22` }}
                    >
                      {cfg.label}
                    </button>
                  </Tooltip>
                ))}
                <Tooltip text="Remove a seleção de ação de todos os fornecedores">
                  <button
                    type="button"
                    onClick={limparTodos}
                    className="text-[10px] font-semibold px-2 py-1 rounded-sm transition-opacity hover:opacity-80 flex items-center gap-1"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--d2b-border)' }}
                  >
                    <Square size={9} />
                    Limpar
                  </button>
                </Tooltip>

                {/* Busca */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-sm"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--d2b-border)', minWidth: '190px' }}
                >
                  <Search size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar fornecedor..."
                    className="flex-1 bg-transparent outline-none text-xs"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  {busca && (
                    <button type="button" onClick={() => setBusca('')} style={{ color: 'var(--text-muted)', lineHeight: 1 }}>
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabela */}
            {loadingSaldoConsigForn ? (
              <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-muted)' }}>
                <Loader2 size={13} className="animate-spin" />
                <span className="text-xs">Carregando fornecedores...</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-sm" style={{ border: '1px solid var(--d2b-border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--d2b-border)' }}>
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Fornecedor
                      </th>
                      <th className="py-2.5 px-3 font-semibold uppercase tracking-wide text-right" style={{ color: 'var(--text-muted)' }}>
                        <Tooltip text="Saldo no est_consig_forn (consig. + transferência)">
                          <span className="flex items-center justify-end gap-1 cursor-default">
                            Consig. <Info size={9} />
                          </span>
                        </Tooltip>
                      </th>
                      <th className="py-2.5 px-3 font-semibold uppercase tracking-wide text-right" style={{ color: 'var(--text-muted)' }}>
                        <Tooltip text="Saldo disponível calculado via ent_pro / itent_pro">
                          <span className="flex items-center justify-end gap-1 cursor-default">
                            Disponível <Info size={9} />
                          </span>
                        </Tooltip>
                      </th>
                      <th className="py-2.5 px-3 font-semibold uppercase tracking-wide text-center" style={{ color: 'var(--text-muted)' }}>
                        <Tooltip text="Indica se há entradas registradas deste fornecedor neste estoque com saldo pendente">
                          <span className="flex items-center justify-center gap-1 cursor-default">
                            Entrou? <Info size={9} />
                          </span>
                        </Tooltip>
                      </th>
                      <th className="py-2.5 px-3 font-semibold uppercase tracking-wide text-center" style={{ color: 'var(--text-muted)', width: '150px' }}>
                        <Tooltip text="Ação a executar para este fornecedor ao confirmar">
                          <span className="flex items-center justify-center gap-1 cursor-default">
                            Ação <Info size={9} />
                          </span>
                        </Tooltip>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fornFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                          {busca ? 'Nenhum fornecedor encontrado para a busca.' : 'Nenhum fornecedor com saldo.'}
                        </td>
                      </tr>
                    ) : fornFiltrados.map((row, i) => {
                      const acao = acoes[row.CD_FORNECEDOR] ?? ''
                      const cfg = acao ? ACAO_CONFIG[acao] : null
                      return (
                        <tr
                          key={row.CD_FORNECEDOR + '-' + i}
                          style={{
                            borderBottom: '1px solid var(--d2b-border)',
                            background: acao
                              ? cfg?.bg + '33'
                              : i % 2 === 1 ? 'var(--d2b-hover)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                        >
                          <td className="py-2.5 px-3" style={{ color: 'var(--text-primary)' }}>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{row.NM_FORNECEDOR}</span>
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Cód. {row.CD_FORNECEDOR}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold" style={{ color: 'var(--success)' }}>
                            {fmtQtd(row.QT_SALDO_CONSIG)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                            {fmtQtd(row.QT_DISPONIVEL_ENTPRO)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Tooltip text={row.SN_ENTROU_POR_ESTOQUE === 'S' ? 'Possui entradas com saldo pendente neste estoque' : 'Sem entradas pendentes neste estoque'}>
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm cursor-default"
                                style={{
                                  background: row.SN_ENTROU_POR_ESTOQUE === 'S' ? 'var(--success-muted)' : 'var(--bg-elevated)',
                                  color: row.SN_ENTROU_POR_ESTOQUE === 'S' ? 'var(--success)' : 'var(--text-muted)',
                                  border: `1px solid ${row.SN_ENTROU_POR_ESTOQUE === 'S' ? 'var(--success)' : 'var(--d2b-border)'}22`,
                                }}
                              >
                                {row.SN_ENTROU_POR_ESTOQUE === 'S' ? 'Sim' : 'Não'}
                              </span>
                            </Tooltip>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <select
                              value={acao}
                              onChange={e => setAcao(row.CD_FORNECEDOR, e.target.value)}
                              className="text-xs px-2 py-1.5 outline-none w-full"
                              style={{
                                background: cfg ? cfg.bg : 'var(--bg-elevated)',
                                border: `1px solid ${cfg ? cfg.color + '55' : 'var(--d2b-border)'}`,
                                color: cfg ? cfg.color : 'var(--text-muted)',
                                fontWeight: cfg ? 600 : 400,
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">— Sem ação —</option>
                              {Object.entries(ACAO_CONFIG).map(([key, c]) => (
                                <option key={key} value={key}>{c.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}
        >
          {/* Resumo das ações */}
          <div className="flex items-center gap-2 flex-wrap">
            {totalComAcao === 0 ? (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhuma ação selecionada.</span>
            ) : Object.entries(resumo).map(([a, n]) => {
              const cfg = ACAO_CONFIG[a]
              if (!cfg) return null
              return (
                <span
                  key={a}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-sm"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {n}× {cfg.label}
                </span>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <button className="btn" onClick={onFechar}>Cancelar</button>
            <button className="btn btn-gradient flex items-center gap-1.5" onClick={onConfirmar}>
              <Plus size={13} />
              Incluir na lista
              {totalComAcao > 0 && (
                <span
                  className="text-[10px] font-bold px-1 py-0.5 rounded-sm"
                  style={{ background: 'rgba(255,255,255,0.25)' }}
                >
                  {totalComAcao}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
