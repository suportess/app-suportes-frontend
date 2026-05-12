'use client'

import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Package, AlertTriangle, Trash2, Loader2, Pencil } from 'lucide-react'
import type { OperacaoBaixaConsignadoDTO } from '@/lib/types'
import { deletarOperacaoBaixa } from '../../actions'
import { fmtQtd } from './sc-shared'

function formatDt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function OperacaoDetalheView({
  operacao,
  onVoltar,
  onExcluido,
  onEditar,
}: {
  operacao: OperacaoBaixaConsignadoDTO
  onVoltar: () => void
  onExcluido?: () => void
  onEditar?: () => void
}) {
  const saldoAlocado  = operacao.itens.reduce(
    (acc, item) => acc + item.linhas.reduce((s, l) => s + (l.quantidade ?? 0), 0),
    0,
  )
  const totalLinhas   = operacao.itens.reduce((a, i) => a + i.linhas.length, 0)
  const jaConcluida   = operacao.status === 'CONCLUIDO'

  const [showConfirm, setShowConfirm] = useState(false)
  const [excluindo, setExcluindo]     = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  async function handleExcluir() {
    setShowConfirm(false)
    setErroExcluir(null)
    setExcluindo(true)
    try {
      await deletarOperacaoBaixa(operacao.empresaId, operacao.id)
      onExcluido?.()
    } catch (e) {
      setErroExcluir(e instanceof Error ? e.message : 'Erro ao excluir operação.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Modal confirmação exclusão */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="card max-w-sm w-full mx-4" style={{ border: '1px solid var(--d2b-border)' }}>
            <div className="card-p flex flex-col gap-4">
              <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Excluir operação?</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                A operação <strong>#{String(operacao.id).padStart(4, '0')}</strong> será excluída permanentemente.
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 justify-end">
                <button className="btn" onClick={() => setShowConfirm(false)}>Cancelar</button>
                <button
                  className="btn flex items-center gap-1.5"
                  style={{ background: 'var(--danger, #ef4444)', color: '#fff', border: 'none' }}
                  onClick={handleExcluir}
                >
                  <Trash2 size={13} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button onClick={onVoltar} className="btn flex items-center gap-1.5">
          <ArrowLeft size={13} />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--d2b-border)' }}
          >
            #{String(operacao.id).padStart(4, '0')}
          </span>
          <span
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{
              color: jaConcluida ? 'var(--success)' : 'var(--warning)',
              background: jaConcluida
                ? 'color-mix(in srgb, var(--success) 12%, transparent)'
                : 'color-mix(in srgb, var(--warning) 12%, transparent)',
              border: jaConcluida
                ? '1px solid color-mix(in srgb, var(--success) 25%, transparent)'
                : '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
            }}
          >
            {jaConcluida ? <><CheckCircle2 size={11} /> Concluída</> : <><AlertTriangle size={11} /> Pendente</>}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDt(operacao.dtCriacao)}</span>
        </div>

        {/* Botões excluir e editar — só para pendentes */}
        {!jaConcluida && (
          <div className="flex items-center gap-2">
            <button
              className="btn flex items-center gap-1.5"
              style={{ color: 'var(--brand)', borderColor: 'var(--brand)' }}
              onClick={() => onEditar?.()}
            >
              <Pencil size={13} /> Editar
            </button>
            <button
              className="btn flex items-center gap-1.5"
              style={{ color: 'var(--danger, #ef4444)', borderColor: 'var(--danger, #ef4444)' }}
              disabled={excluindo}
              onClick={() => setShowConfirm(true)}
            >
              {excluindo
                ? <><Loader2 size={13} className="animate-spin" /> Excluindo...</>
                : <><Trash2 size={13} /> Excluir</>
              }
            </button>
          </div>
        )}
      </div>

      {erroExcluir && (
        <div className="alert alert-danger">
          <AlertTriangle size={14} /><span>{erroExcluir}</span>
        </div>
      )}

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
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {operacao.dsEstoque ?? `Cód. ${operacao.cdEstoque}`}
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

            <div
              className="flex flex-col gap-0.5 px-4 py-3 rounded-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Produtos destino
              </span>
              <span className="text-2xl font-bold font-mono leading-none" style={{ color: 'var(--text-secondary)' }}>
                {operacao.itens.length}
              </span>
            </div>

          </div>

          {/* Produtos de origem */}
          {operacao.origens.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Produtos de origem · {operacao.origens.length}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {operacao.origens.map(o => (
                  <div
                    key={o.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--d2b-border)' }}
                  >
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {o.dsProduto ?? `Cód. ${o.cdProduto}`}
                    </span>
                    {o.qtEstoqueAtual != null && (
                      <span
                        className="text-[10px] font-mono font-bold px-1 py-0.5 rounded-sm"
                        style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
                      >
                        {fmtQtd(o.qtEstoqueAtual)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Título seção destino */}
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Produtos de destino · {operacao.itens.length} produto{operacao.itens.length !== 1 ? 's' : ''}
      </span>

      {/* Card por produto de destino */}
      {operacao.itens.map((item) => {
        const qtdTotal = item.linhas.reduce((s, l) => s + (l.quantidade ?? 0), 0)
        return (
          <div key={item.id} className="card">
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
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {item.dsProduto ?? `Cód. ${item.cdProduto}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cód. {item.cdProduto}</span>
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
                        style={{ color: 'var(--text-muted)', opacity: item.snValidade === 'N' ? 0.45 : 1 }}
                      >
                        Validade
                        {item.snValidade === 'N' && <span className="ml-1 font-normal normal-case tracking-normal">(sem controle)</span>}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.linhas.map((l, li) => (
                      <tr
                        key={l.id}
                        style={{
                          borderBottom: li < item.linhas.length - 1 ? '1px solid var(--d2b-border)' : undefined,
                          background: li % 2 === 1 ? 'var(--d2b-hover)' : 'transparent',
                        }}
                      >
                        <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{l.nmFornecedor ?? `Cód. ${l.cdFornecedor}`}</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Cód. {l.cdFornecedor}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: 'var(--brand)' }}>
                          {fmtQtd(l.quantidade ?? 0)}
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

      {/* Rodapé */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-4 rounded-sm"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--d2b-border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {operacao.itens.length} produto{operacao.itens.length !== 1 ? 's' : ''}
          {' · '}
          {totalLinhas} linha{totalLinhas !== 1 ? 's' : ''}
          {' · '}
          total <span className="font-mono font-semibold">{fmtQtd(saldoAlocado)}</span>
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {jaConcluida
            ? `Concluída em ${formatDt(operacao.dtConclusao)}`
            : `Criada em ${formatDt(operacao.dtCriacao)}`
          }
        </span>
      </div>

    </div>
  )
}
