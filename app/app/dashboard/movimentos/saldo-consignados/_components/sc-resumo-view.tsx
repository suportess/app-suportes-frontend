'use client'

import { ArrowLeft, ChevronRight, CheckCircle2, Package, AlertTriangle } from 'lucide-react'
import type { SaldoProdutoConsignadoPortalDTO } from '@/lib/types'
import { fmtQtd, type Item, type ItemAdicionado } from './sc-shared'

export function ResumoView({
  estoque,
  selecionados,
  adicionados,
  saldoTotal,
  saldoAlocado,
  operacaoId,
  onVoltar,
  onConcluir,
}: {
  estoque: Item
  selecionados: SaldoProdutoConsignadoPortalDTO[]
  adicionados: ItemAdicionado[]
  saldoTotal: number
  saldoAlocado: number
  operacaoId?: number | null
  onVoltar: () => void
  onConcluir: () => void
}) {
  const saldoRestante   = Math.max(0, saldoTotal - saldoAlocado)
  const totalLinhas     = adicionados.reduce((a, i) => a + i.linhas.length, 0)

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
          <span>Etapa 2</span>
          <ChevronRight size={11} />
          <span className="font-semibold" style={{ color: 'var(--brand)' }}>Etapa 3 · Resumo</span>
        </div>
      </div>

      {/* Card resumo geral */}
      <div className="card">
        <div className="card-p flex flex-col gap-4">

          <div className="section-label">
            <CheckCircle2 size={12} />
            <span>Resumo da operação</span>
          </div>

          {/* Cards de totais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            <div
              className="col-span-2 flex flex-col gap-0.5 px-4 py-3 rounded-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Estoque origem
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{estoque.label}</span>
            </div>

            <div
              className="flex flex-col gap-0.5 px-4 py-3 rounded-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Saldo total
              </span>
              <span className="text-2xl font-bold font-mono leading-none" style={{ color: 'var(--text-secondary)' }}>
                {fmtQtd(saldoTotal)}
              </span>
            </div>

            <div
              className="flex flex-col gap-0.5 px-4 py-3 rounded-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Alocado
              </span>
              <span className="text-2xl font-bold font-mono leading-none" style={{ color: 'var(--brand)' }}>
                {fmtQtd(saldoAlocado)}
              </span>
            </div>

          </div>

          {/* Produtos de origem */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Produtos de origem · {selecionados.length}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selecionados.map(s => (
                <div
                  key={s.CD_PRODUTO}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
                >
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{s.DS_PRODUTO}</span>
                  <span
                    className="text-[10px] font-mono font-bold px-1 py-0.5 rounded-sm"
                    style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
                  >
                    {fmtQtd(s.QT_ESTOQUE_ATUAL)}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Aviso saldo restante */}
      {saldoRestante > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-sm text-xs font-medium"
          style={{ background: 'var(--warning-muted, #fef3c744)', border: '1px solid var(--warning, #f59e0b)', color: 'var(--warning, #f59e0b)' }}
        >
          <AlertTriangle size={13} className="flex-shrink-0" />
          <span>
            Saldo restante não alocado:{' '}
            <span className="font-mono font-bold">{fmtQtd(saldoRestante)}</span>
            {' '}— este saldo ficará sem destino definido.
          </span>
        </div>
      )}

      {/* Título seção destino */}
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Produtos de destino · {adicionados.length} produto{adicionados.length !== 1 ? 's' : ''}
      </span>

      {/* Card por produto de destino */}
      {adicionados.map((item, idx) => {
        const qtdTotal = item.linhas.reduce(
          (s, l) => s + (parseFloat(l.quantidade.replace(',', '.')) || 0), 0,
        )
        return (
          <div key={item.produto.CD_PRODUTO + '-' + idx} className="card">
            <div className="card-p flex flex-col gap-3">

              {/* Header produto */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--brand-muted)' }}
                  >
                    <Package size={13} style={{ color: 'var(--brand)' }} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.produto.DS_PRODUTO}</span>
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
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total</span>
                  <span className="font-mono font-bold text-xl leading-none" style={{ color: 'var(--brand)' }}>{fmtQtd(qtdTotal)}</span>
                </div>
              </div>

              {/* Tabela de linhas */}
              <div className="overflow-x-auto rounded-sm" style={{ border: '1px solid var(--d2b-border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--d2b-border)' }}>
                      <th className="text-left py-2 px-3 font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Fornecedor
                      </th>
                      <th className="text-right py-2 px-3 font-semibold uppercase tracking-wide w-28" style={{ color: 'var(--text-muted)' }}>
                        Quantidade
                      </th>
                      {item.snLote === 'S' && (
                        <th className="text-left py-2 px-3 font-semibold uppercase tracking-wide w-44" style={{ color: 'var(--text-muted)' }}>
                          Lote
                        </th>
                      )}
                      <th
                        className="text-left py-2 px-3 font-semibold uppercase tracking-wide w-36"
                        style={{ color: item.snValidade === 'N' ? 'var(--text-muted)' : 'var(--text-muted)', opacity: item.snValidade === 'N' ? 0.45 : 1 }}
                      >
                        Validade
                        {item.snValidade === 'N' && <span className="ml-1 font-normal normal-case tracking-normal">(sem controle)</span>}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.linhas.map((l, li) => (
                      <tr
                        key={l.fornecedor.CD_FORNECEDOR + '-' + li}
                        style={{
                          borderBottom: li < item.linhas.length - 1 ? '1px solid var(--d2b-border)' : undefined,
                          background: li % 2 === 1 ? 'var(--d2b-hover)' : 'transparent',
                        }}
                      >
                        <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{l.fornecedor.NM_FORNECEDOR}</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Cód. {l.fornecedor.CD_FORNECEDOR}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: 'var(--brand)' }}>
                          {fmtQtd(parseFloat(l.quantidade.replace(',', '.')) || 0)}
                        </td>
                        {item.snLote === 'S' && (
                          <td className="py-2 px-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
                            {l.lote || '—'}
                          </td>
                        )}
                        <td
                          className="py-2 px-3 font-mono"
                          style={{ color: 'var(--text-secondary)', opacity: item.snValidade === 'N' ? 0.4 : 1 }}
                        >
                          {l.validade || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )
      })}

      {/* Rodapé de ação */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-4 rounded-sm sticky bottom-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--d2b-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {adicionados.length} produto{adicionados.length !== 1 ? 's' : ''}
          {' · '}
          {totalLinhas} linha{totalLinhas !== 1 ? 's' : ''}
          {' · '}
          total <span className="font-mono font-semibold">{fmtQtd(saldoAlocado)}</span>
        </span>
        <div className="flex items-center gap-2">
          <button className="btn flex items-center gap-1.5" onClick={onVoltar}>
            <ArrowLeft size={13} />
            Voltar
          </button>
          <button className="btn btn-gradient flex items-center gap-1.5" onClick={onConcluir}>
            <CheckCircle2 size={14} />
            Confirmar Operação
          </button>
        </div>
      </div>

    </div>
  )
}
