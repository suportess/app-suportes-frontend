'use client'

import { useState, useRef, useCallback } from 'react'
import { Sparkles, Play, Copy, WrapText, X, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { EmpresaDTO } from '@/lib/types'
import { gerarSqlComIA, executarConsulta } from '../actions'

// ─── SQL formatter ────────────────────────────────────────────────────────────

const CLAUSE_RE =
  /\b(SELECT|FROM|WHERE|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|JOIN|ON|GROUP\s+BY|ORDER\s+BY|HAVING|UNION\s+ALL|UNION|SET|VALUES)\b/gi

function formatarSql(sql: string): string {
  if (!sql.trim()) return sql
  const normalizado = sql.replace(/\s+/g, ' ').trim()
  return normalizado.replace(CLAUSE_RE, (m) => `\n${m.toUpperCase()}`).replace(/^\n/, '').trim()
}

// ─── Dynamic results table ────────────────────────────────────────────────────

function TabelaResultados({ dados }: { dados: Record<string, unknown>[] }) {
  if (dados.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        Consulta executada — nenhum registro retornado.
      </p>
    )
  }

  const colunas = Object.keys(dados[0])

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {colunas.map((col) => (
              <th
                key={col}
                style={{
                  padding: '6px 12px',
                  textAlign: 'left',
                  borderBottom: '2px solid var(--d2b-border)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: 'var(--bg-elevated)',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  letterSpacing: '0.04em',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((row, i) => (
            <tr
              key={i}
              style={{
                borderBottom: '1px solid var(--d2b-border)',
                background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)',
              }}
            >
              {colunas.map((col) => {
                const val = row[col]
                return (
                  <td
                    key={col}
                    style={{
                      padding: '7px 12px',
                      color: val === null || val === undefined ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontFamily: typeof val === 'number' ? 'monospace' : undefined,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {val === null || val === undefined ? '—' : String(val)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── AI Modal ─────────────────────────────────────────────────────────────────

function ModalIA({
  onFechar,
  onGerar,
}: {
  onFechar: () => void
  onGerar: (sql: string) => void
}) {
  const [pergunta, setPergunta] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleGerar() {
    if (!pergunta.trim()) return
    setCarregando(true)
    setErro(null)
    const result = await gerarSqlComIA(pergunta)
    setCarregando(false)
    if (result.error) {
      setErro(result.error)
      return
    }
    if (result.data?.sql) {
      onGerar(result.data.sql)
      onFechar()
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 520, margin: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: 'var(--brand)' }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>Assistente SQL</span>
          </div>
          <button className="icon-btn" onClick={onFechar}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Descreva em português o que você precisa consultar. A IA vai gerar o SQL Oracle.
        </p>

        <textarea
          autoFocus
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGerar() }}
          placeholder="Ex: Liste os 10 últimos movimentos de estoque com o nome do produto e data"
          style={{
            width: '100%',
            minHeight: 100,
            resize: 'vertical',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--d2b-border)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {erro && (
          <div className="alert alert-danger" style={{ marginTop: 10, fontSize: 13 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {erro}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={onFechar} disabled={carregando}>
            Cancelar
          </button>
          <button
            className="btn btn-gradient"
            onClick={handleGerar}
            disabled={carregando || !pergunta.trim()}
          >
            {carregando ? (
              <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Gerando...</>
            ) : (
              <><Sparkles size={14} /> Gerar SQL</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function SqlView({ empresa }: { empresa: EmpresaDTO | null }) {
  const [sql, setSql] = useState('')
  const [modalIaAberto, setModalIaAberto] = useState(false)
  const [executando, setExecutando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultados, setResultados] = useState<Record<string, unknown>[] | null>(null)
  const [resultadosVisiveis, setResultadosVisiveis] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      const next = el.value.substring(0, start) + '  ' + el.value.substring(end)
      setSql(next)
      requestAnimationFrame(() => {
        el.selectionStart = start + 2
        el.selectionEnd = start + 2
      })
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleExecutar()
    }
  }

  function handleCopiar() {
    if (sql) navigator.clipboard.writeText(sql)
  }

  function handleFormatar() {
    setSql((s) => formatarSql(s))
  }

  function handleIaGerou(sqlGerado: string) {
    setSql(formatarSql(sqlGerado))
    setResultados(null)
    setErro(null)
  }

  async function handleExecutar() {
    if (!sql.trim()) return
    if (!empresa) {
      setErro('Nenhuma empresa com portal configurado. Acesse Configurações › Empresa.')
      return
    }
    setExecutando(true)
    setErro(null)
    setResultados(null)
    const result = await executarConsulta(empresa.id, sql.trim())
    setExecutando(false)
    if (result.error) {
      setErro(result.error)
      return
    }
    setResultados(result.data ?? [])
    setResultadosVisiveis(true)
  }

  return (
    <>
      {modalIaAberto && (
        <ModalIA onFechar={() => setModalIaAberto(false)} onGerar={handleIaGerou} />
      )}

      <div className="page">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Consultas SQL</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Execute consultas Oracle via portal MV. Use a IA para gerar o SQL a partir de texto.
            </p>
          </div>
          <button className="btn btn-gradient" onClick={() => setModalIaAberto(true)}>
            <Sparkles size={15} />
            Assistente IA
          </button>
        </div>

        {/* Empresa sem portal */}
        {!empresa && (
          <div className="alert alert-danger" style={{ marginBottom: 20 }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            Nenhuma empresa com portal configurado. Acesse{' '}
            <strong>Configurações › Empresa</strong> e preencha o campo Host Portal.
          </div>
        )}

        {/* SQL Editor */}
        <div className="card" style={{ marginBottom: 20 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
            <span className="section-label">Editor SQL</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleFormatar}
                title="Formatar SQL"
                disabled={!sql.trim()}
              >
                <WrapText size={13} /> Formatar
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCopiar}
                title="Copiar SQL"
                disabled={!sql.trim()}
              >
                <Copy size={13} /> Copiar
              </button>
              <button
                className="btn btn-gradient"
                onClick={handleExecutar}
                disabled={executando || !sql.trim() || !empresa}
                title="Executar (Ctrl+Enter)"
              >
                {executando ? (
                  <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Executando...</>
                ) : (
                  <><Play size={13} /> Executar</>
                )}
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'SELECT *\nFROM DBAMV.MOV_ESTOQUE\nWHERE ROWNUM <= 10'}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 200,
              resize: 'vertical',
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid var(--d2b-border)',
              background: '#1a1d23',
              color: '#e2e8f0',
              fontSize: 13,
              fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
              lineHeight: 1.6,
              outline: 'none',
              boxSizing: 'border-box',
              caretColor: 'var(--brand)',
            }}
          />

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            Dica: <kbd style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--d2b-border)' }}>Ctrl</kbd>+<kbd style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--d2b-border)' }}>Enter</kbd> executa · <kbd style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--d2b-border)' }}>Tab</kbd> insere espaços
          </p>
        </div>

        {/* Erro de execução */}
        {erro && (
          <div className="alert alert-danger" style={{ marginBottom: 20 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {erro}
          </div>
        )}

        {/* Resultados */}
        {resultados !== null && (
          <div className="card">
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: resultadosVisiveis ? 16 : 0, cursor: 'pointer' }}
              onClick={() => setResultadosVisiveis((v) => !v)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="section-label">Resultados</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: resultados.length > 0 ? 'var(--success-muted)' : 'var(--bg-elevated)',
                    color: resultados.length > 0 ? 'var(--success)' : 'var(--text-muted)',
                  }}
                >
                  {resultados.length} {resultados.length === 1 ? 'linha' : 'linhas'}
                </span>
              </div>
              <button className="icon-btn">
                {resultadosVisiveis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {resultadosVisiveis && <TabelaResultados dados={resultados} />}
          </div>
        )}
      </div>
    </>
  )
}
