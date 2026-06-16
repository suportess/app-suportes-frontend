'use client'

import { useState, useRef } from 'react'
import {
  Sparkles, Play, Copy, WrapText, X, Loader2,
  AlertCircle, ChevronDown, ChevronUp, Trash2,
  FileCode2, Table2,
} from 'lucide-react'
import type { EmpresaDTO } from '@/lib/types'
import { gerarSqlComIA, executarConsulta } from '../actions'

// ─── SQL formatter ────────────────────────────────────────────────────────────

const CLAUSE_RE =
  /\b(SELECT|FROM|WHERE|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|JOIN|ON|GROUP\s+BY|ORDER\s+BY|HAVING|UNION\s+ALL|UNION|SET|VALUES)\b/gi

function formatarSql(sql: string): string {
  if (!sql.trim()) return sql
  const normalizado = sql.replace(/\s+/g, ' ').trim()
  return normalizado
    .replace(CLAUSE_RE, (m) => `\n${m.toUpperCase()}`)
    .replace(/^\n/, '')
    .trim()
}

// ─── Dynamic results table ────────────────────────────────────────────────────

function TabelaResultados({ dados }: { dados: Record<string, unknown>[] }) {
  if (dados.length === 0) {
    return (
      <div style={{ padding: '2.5rem', textAlign: 'center' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Consulta executada — nenhum registro retornado.
        </p>
      </div>
    )
  }

  const colunas = Object.keys(dados[0])

  return (
    <div className="overflow-auto" style={{ maxHeight: 420 }}>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            {colunas.map((col) => (
              <th key={col} style={{ whiteSpace: 'nowrap' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((row, i) => (
            <tr key={i}>
              {colunas.map((col) => {
                const val = row[col]
                const isNull = val === null || val === undefined
                return (
                  <td
                    key={col}
                    style={{
                      whiteSpace: 'nowrap',
                      color: isNull ? 'var(--text-muted)' : undefined,
                      fontFamily: typeof val === 'number' ? 'monospace' : undefined,
                    }}
                  >
                    {isNull ? '—' : String(val)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-footer">
        {dados.length.toLocaleString('pt-BR')} linha{dados.length !== 1 ? 's' : ''} ·{' '}
        {colunas.length} coluna{colunas.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

// ─── AI Modal ─────────────────────────────────────────────────────────────────

function ModalIA({
  pergunta,
  setPergunta,
  onFechar,
  onGerar,
}: {
  pergunta: string
  setPergunta: (v: string) => void
  onFechar: () => void
  onGerar: (sql: string) => void
}) {
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
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 700, margin: '0 20px', padding: 0, overflow: 'hidden' }}
      >
        {/* Header com gradiente */}
        <div
          style={{
            padding: '20px 24px 18px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, transparent 60%)',
            borderBottom: '1px solid var(--d2b-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--brand) 0%, #818cf8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Assistente SQL</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Descreva o que precisa — a IA gera o SQL Oracle
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onFechar}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 24px' }}>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
            Sua pergunta
          </label>

          {/* Textarea com borda gradiente quando tem texto */}
          <div
            style={{
              borderRadius: 10, padding: 2,
              background: pergunta.trim()
                ? 'linear-gradient(135deg, var(--brand) 0%, #818cf8 100%)'
                : 'var(--d2b-border)',
              transition: 'background 0.2s',
            }}
          >
            <textarea
              autoFocus
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGerar() }}
              placeholder="Ex: Liste os 10 últimos movimentos de estoque com nome do produto, data e quantidade"
              style={{
                width: '100%', minHeight: 140, resize: 'vertical',
                padding: '12px 14px', borderRadius: 8, border: 'none',
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6,
                outline: 'none', boxSizing: 'border-box', display: 'block',
              }}
            />
          </div>

          <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {pergunta.length > 0 ? `${pergunta.length} caracteres` : 'Ctrl+Enter para gerar'}
            </span>
            {pergunta.trim() && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setPergunta(''); setErro(null) }}
                style={{ fontSize: 11, gap: 4 }}
                disabled={carregando}
              >
                <Trash2 size={11} /> Limpar
              </button>
            )}
          </div>

          {erro && (
            <div className="alert alert-danger" style={{ marginTop: 12, fontSize: 13 }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {erro}
            </div>
          )}

          <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
            <button className="btn btn-ghost btn-sm" onClick={onFechar} disabled={carregando}>
              Fechar
            </button>
            <button
              className="btn btn-gradient"
              onClick={handleGerar}
              disabled={carregando || !pergunta.trim()}
            >
              {carregando ? (
                <><Loader2 size={14} className="animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles size={14} /> Gerar SQL</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function SqlView({ empresa }: { empresa: EmpresaDTO | null }) {
  const [sql, setSql] = useState('')
  const [pergunta, setPergunta] = useState('')
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
      setSql(el.value.substring(0, start) + '  ' + el.value.substring(end))
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
        <ModalIA
          pergunta={pergunta}
          setPergunta={setPergunta}
          onFechar={() => setModalIaAberto(false)}
          onGerar={handleIaGerou}
        />
      )}

      <div className="flex flex-col gap-3">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ margin: 0 }}>Consultas SQL</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Execute consultas Oracle via portal MV. Use a IA para gerar o SQL a partir de texto.
            </p>
          </div>
          <button className="btn btn-gradient flex items-center gap-1.5" onClick={() => setModalIaAberto(true)}>
            <Sparkles size={15} />
            Assistente IA
          </button>
        </div>

        {/* ── Alerta empresa sem portal ── */}
        {!empresa && (
          <div className="alert alert-danger">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            Nenhuma empresa com portal configurado. Acesse{' '}
            <strong>Configurações › Empresa</strong> e preencha o campo Host Portal.
          </div>
        )}

        {/* ── SQL Editor ── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Card header com toolbar */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ borderBottom: '1px solid var(--d2b-border)', flexWrap: 'wrap' }}
          >
            <FileCode2 size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Editor SQL
            </span>
            <div className="flex items-center gap-1.5" style={{ marginLeft: 'auto' }}>
              <button
                className="btn btn-ghost btn-sm flex items-center gap-1"
                onClick={handleFormatar}
                disabled={!sql.trim()}
                title="Formatar SQL"
              >
                <WrapText size={12} /> Formatar
              </button>
              <button
                className="btn btn-ghost btn-sm flex items-center gap-1"
                onClick={handleCopiar}
                disabled={!sql.trim()}
                title="Copiar SQL"
              >
                <Copy size={12} /> Copiar
              </button>
              <button
                className="btn btn-gradient flex items-center gap-1.5"
                onClick={handleExecutar}
                disabled={executando || !sql.trim() || !empresa}
                title="Executar (Ctrl+Enter)"
              >
                {executando ? (
                  <><Loader2 size={13} className="animate-spin" /> Executando...</>
                ) : (
                  <><Play size={12} /> Executar</>
                )}
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div style={{ padding: '12px 16px 8px' }}>
            <textarea
              ref={textareaRef}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={'SELECT *\nFROM DBAMV.MOV_ESTOQUE\nWHERE ROWNUM <= 10'}
              spellCheck={false}
              style={{
                width: '100%', minHeight: 340, resize: 'vertical',
                padding: '12px 14px', borderRadius: 8,
                border: '1px solid var(--d2b-border)',
                background: '#1a1d23', color: '#e2e8f0',
                fontSize: 13,
                fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                lineHeight: 1.6, outline: 'none', boxSizing: 'border-box',
                caretColor: 'var(--brand)',
              }}
            />
          </div>

          <div className="table-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
            <kbd style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--d2b-border)', fontSize: 10 }}>Ctrl</kbd>
            {'+'}
            <kbd style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--d2b-border)', fontSize: 10 }}>Enter</kbd>
            {' executa · '}
            <kbd style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--d2b-border)', fontSize: 10 }}>Tab</kbd>
            {' insere espaços'}
          </div>
        </div>

        {/* ── Erro de execução ── */}
        {erro && (
          <div className="alert alert-danger">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {erro}
          </div>
        )}

        {/* ── Resultados ── */}
        {resultados !== null && (
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Card header clicável para colapsar */}
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{ borderBottom: resultadosVisiveis ? '1px solid var(--d2b-border)' : 'none', cursor: 'pointer' }}
              onClick={() => setResultadosVisiveis((v) => !v)}
            >
              <Table2 size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Resultados
              </span>
              <span className={`badge ${resultados.length > 0 ? 'badge-brand' : 'badge-muted'}`}>
                {resultados.length.toLocaleString('pt-BR')}
              </span>
              {resultados.length > 0 && (
                <span className="badge badge-muted" style={{ marginLeft: 0 }}>
                  {Object.keys(resultados[0]).length} col.
                </span>
              )}
              <button className="icon-btn" style={{ marginLeft: 'auto' }}>
                {resultadosVisiveis ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {resultadosVisiveis && <TabelaResultados dados={resultados} />}
          </div>
        )}

      </div>
    </>
  )
}
