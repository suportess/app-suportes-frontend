'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import {
  Sparkles, Play, Copy, WrapText, X, Loader2, AlertCircle,
  ChevronDown, ChevronUp, Trash2, FileCode2, Table2,
  GripVertical, Eye, EyeOff, Download, Save, BookOpen,
  Check, Pencil,
} from 'lucide-react'
import type { EmpresaDTO, ConsultaSalvaDTO } from '@/lib/types'
import {
  gerarSqlComIA, executarConsulta,
  listarConsultas, salvarConsulta, deletarConsulta,
} from '../actions'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ColConfig = { key: string; label: string; visible: boolean }
type ActionResult<T = void> = { data?: T; error?: string }

// ─── SQL formatter ────────────────────────────────────────────────────────────

const CLAUSE_RE =
  /\b(SELECT|FROM|WHERE|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|JOIN|ON|GROUP\s+BY|ORDER\s+BY|HAVING|UNION\s+ALL|UNION|SET|VALUES)\b/gi

function formatarSql(sql: string): string {
  if (!sql.trim()) return sql
  return sql
    .replace(/\s+/g, ' ')
    .trim()
    .replace(CLAUSE_RE, (m) => `\n${m.toUpperCase()}`)
    .replace(/^\n/, '')
    .trim()
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportarCsv(dados: Record<string, unknown>[], colunas: ColConfig[]) {
  const visiveis = colunas.filter((c) => c.visible)
  function esc(v: string) {
    return v.includes(',') || v.includes('"') || v.includes('\n')
      ? `"${v.replace(/"/g, '""')}"`
      : v
  }
  const header = visiveis.map((c) => esc(c.label)).join(',')
  const rows = dados.map((row) =>
    visiveis
      .map((c) => {
        const val = row[c.key]
        return val === null || val === undefined ? '' : esc(String(val))
      })
      .join(','),
  )
  const csv = '﻿' + [header, ...rows].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `consulta_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Modal IA ─────────────────────────────────────────────────────────────────

function ModalIA({
  pergunta, setPergunta, onFechar, onGerar,
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
    if (result.error) { setErro(result.error); return }
    if (result.data?.sql) { onGerar(result.data.sql); onFechar() }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 700, margin: '0 20px', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 18px', background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, transparent 60%)', borderBottom: '1px solid var(--d2b-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, var(--brand) 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Assistente SQL</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Descreva o que precisa — a IA gera o SQL Oracle</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onFechar}><X size={16} /></button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
            Sua pergunta
          </label>
          <div style={{ borderRadius: 10, padding: 2, background: pergunta.trim() ? 'linear-gradient(135deg, var(--brand) 0%, #818cf8 100%)' : 'var(--d2b-border)', transition: 'background 0.2s' }}>
            <textarea
              autoFocus
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGerar() }}
              placeholder="Ex: Liste os 10 últimos movimentos de estoque com nome do produto, data e quantidade"
              style={{ width: '100%', minHeight: 140, resize: 'vertical', padding: '12px 14px', borderRadius: 8, border: 'none', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', boxSizing: 'border-box', display: 'block' }}
            />
          </div>
          <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {pergunta.length > 0 ? `${pergunta.length} caracteres` : 'Ctrl+Enter para gerar'}
            </span>
            {pergunta.trim() && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setPergunta(''); setErro(null) }} style={{ fontSize: 11, gap: 4 }} disabled={carregando}>
                <Trash2 size={11} /> Limpar
              </button>
            )}
          </div>
          {erro && <div className="alert alert-danger" style={{ marginTop: 12, fontSize: 13 }}><AlertCircle size={14} style={{ flexShrink: 0 }} />{erro}</div>}
          <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
            <button className="btn btn-ghost btn-sm" onClick={onFechar} disabled={carregando}>Fechar</button>
            <button className="btn btn-gradient" onClick={handleGerar} disabled={carregando || !pergunta.trim()}>
              {carregando ? <><Loader2 size={14} className="animate-spin" /> Gerando...</> : <><Sparkles size={14} /> Gerar SQL</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Salvar ─────────────────────────────────────────────────────────────

function ModalSalvar({
  onFechar, onSalvar,
}: {
  onFechar: () => void
  onSalvar: (nome: string) => Promise<ActionResult<ConsultaSalvaDTO>>
}) {
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSalvar() {
    if (!nome.trim()) return
    setCarregando(true)
    setErro(null)
    const result = await onSalvar(nome.trim())
    setCarregando(false)
    if (result.error) { setErro(result.error); return }
    onFechar()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 440, margin: '0 20px', padding: 0, overflow: 'hidden' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--d2b-border)' }}>
          <div className="flex items-center gap-2">
            <Save size={16} style={{ color: 'var(--brand)' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Salvar Consulta</span>
          </div>
          <button className="icon-btn" onClick={onFechar}><X size={16} /></button>
        </div>
        <div style={{ padding: '20px' }}>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
            Nome da consulta
          </label>
          <input
            autoFocus
            className="input-field w-full"
            placeholder="Ex: Saldo por produto — estoque principal"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSalvar() }}
            maxLength={200}
          />
          <div className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
            {nome.length}/200
          </div>
          {erro && <div className="alert alert-danger" style={{ marginTop: 10, fontSize: 13 }}><AlertCircle size={14} style={{ flexShrink: 0 }} />{erro}</div>}
          <div className="flex justify-end gap-2" style={{ marginTop: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={onFechar} disabled={carregando}>Cancelar</button>
            <button className="btn btn-gradient" onClick={handleSalvar} disabled={carregando || !nome.trim()}>
              {carregando ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Painel consultas salvas ──────────────────────────────────────────────────

function PainelConsultas({
  consultas, carregando, onCarregar, onDeletar, onFechar,
}: {
  consultas: ConsultaSalvaDTO[]
  carregando: boolean
  onCarregar: (sql: string) => void
  onDeletar: (id: number) => void
  onFechar: () => void
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 600, margin: '0 20px', padding: 0, overflow: 'hidden', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--d2b-border)', flexShrink: 0 }}>
          <div className="flex items-center gap-2">
            <BookOpen size={15} style={{ color: 'var(--brand)' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Consultas Salvas</span>
            {consultas.length > 0 && <span className="badge badge-brand">{consultas.length}</span>}
          </div>
          <button className="icon-btn" onClick={onFechar}><X size={16} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-12">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand)' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando...</span>
            </div>
          ) : consultas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <BookOpen size={28} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma consulta salva ainda.</p>
            </div>
          ) : (
            consultas.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--d2b-border)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {c.nome}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.sqlTexto}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(c.dtCriacao).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
                  <button
                    className="btn btn-ghost btn-sm flex items-center gap-1"
                    onClick={() => { onCarregar(c.sqlTexto); onFechar() }}
                  >
                    <FileCode2 size={12} /> Carregar
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => onDeletar(c.id)}
                    title="Excluir consulta"
                  >
                    <Trash2 size={13} style={{ color: 'var(--danger, #dc2626)' }} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Painel de colunas ────────────────────────────────────────────────────────

function PainelColunas({
  colunas, onChange,
}: {
  colunas: ColConfig[]
  onChange: (next: ColConfig[]) => void
}) {
  const dragIdx = useRef<number | null>(null)
  const [editando, setEditando] = useState<number | null>(null)
  const [editVal, setEditVal] = useState('')

  function startEdit(i: number) {
    setEditando(i)
    setEditVal(colunas[i].label)
  }

  function commitEdit(i: number) {
    if (editVal.trim()) {
      const next = [...colunas]
      next[i] = { ...next[i], label: editVal.trim() }
      onChange(next)
    }
    setEditando(null)
  }

  function toggleVisible(i: number) {
    const next = [...colunas]
    next[i] = { ...next[i], visible: !next[i].visible }
    onChange(next)
  }

  function onDragStart(i: number) { dragIdx.current = i }

  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === i) return
    const next = [...colunas]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(i, 0, moved)
    dragIdx.current = i
    onChange(next)
  }

  function onDragEnd() { dragIdx.current = null }

  const todasVisiveis = colunas.every((c) => c.visible)

  return (
    <div style={{ borderBottom: '1px solid var(--d2b-border)', background: 'var(--bg-elevated)' }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--d2b-border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-muted)', flex: 1 }}>
          Arraste para reordenar · clique no nome para renomear · olho para ocultar
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(colunas.map((c) => ({ ...c, visible: !todasVisiveis })))}
          style={{ fontSize: 11 }}
        >
          {todasVisiveis ? <EyeOff size={11} /> : <Eye size={11} />}
          {todasVisiveis ? 'Ocultar todas' : 'Mostrar todas'}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(colunas.map((c) => ({ ...c, label: c.key })))}
          style={{ fontSize: 11 }}
        >
          Resetar nomes
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 16px' }}>
        {colunas.map((col, i) => (
          <div
            key={col.key}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDragEnd={onDragEnd}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 6, fontSize: 12,
              border: '1px solid var(--d2b-border)',
              background: col.visible ? 'var(--bg-elevated)' : 'transparent',
              opacity: col.visible ? 1 : 0.45,
              cursor: 'grab', userSelect: 'none',
            }}
          >
            <GripVertical size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            {editando === i ? (
              <input
                autoFocus
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={() => commitEdit(i)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(i); if (e.key === 'Escape') setEditando(null) }}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, width: Math.max(editVal.length * 7, 40), color: 'var(--text-primary)' }}
              />
            ) : (
              <span
                onClick={() => startEdit(i)}
                title="Clique para renomear"
                style={{ color: 'var(--text-primary)', cursor: 'text' }}
              >
                {col.label}
              </span>
            )}
            <button
              onClick={() => toggleVisible(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 0 }}
              title={col.visible ? 'Ocultar coluna' : 'Mostrar coluna'}
            >
              {col.visible
                ? <Eye size={11} style={{ color: 'var(--text-muted)' }} />
                : <EyeOff size={11} style={{ color: 'var(--text-muted)' }} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tabela dinâmica ──────────────────────────────────────────────────────────

function TabelaResultados({ dados, colunas }: { dados: Record<string, unknown>[]; colunas: ColConfig[] }) {
  const visiveis = colunas.filter((c) => c.visible)

  if (dados.length === 0) {
    return (
      <div style={{ padding: '2.5rem', textAlign: 'center' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Consulta executada — nenhum registro retornado.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-auto" style={{ maxHeight: 420 }}>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            {visiveis.map((col) => (
              <th key={col.key} style={{ whiteSpace: 'nowrap' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((row, i) => (
            <tr key={i}>
              {visiveis.map((col) => {
                const val = row[col.key]
                const isNull = val === null || val === undefined
                return (
                  <td
                    key={col.key}
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
        {visiveis.length}/{colunas.length} colunas visíveis
      </div>
    </div>
  )
}

// ─── View principal ───────────────────────────────────────────────────────────

export function SqlView({ empresa }: { empresa: EmpresaDTO | null }) {
  const [sql, setSql] = useState('')
  const [pergunta, setPergunta] = useState('')

  // Modais
  const [modalIa, setModalIa] = useState(false)
  const [modalSalvar, setModalSalvar] = useState(false)
  const [painelConsultas, setPainelConsultas] = useState(false)

  // Execução
  const [executando, setExecutando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultados, setResultados] = useState<Record<string, unknown>[] | null>(null)

  // Visibilidade das seções
  const [editorVisivel, setEditorVisivel] = useState(true)
  const [resultadosVisiveis, setResultadosVisiveis] = useState(true)
  const [colunasVisiveis, setColunasVisiveis] = useState(false)

  // Configuração de colunas
  const [colConfig, setColConfig] = useState<ColConfig[]>([])

  // Consultas salvas
  const [consultas, setConsultas] = useState<ConsultaSalvaDTO[]>([])
  const [carregandoConsultas, startConsultas] = useTransition()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function abrirConsultas() {
    setPainelConsultas(true)
    startConsultas(async () => setConsultas(await listarConsultas()))
  }

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
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleExecutar()
  }

  function handleIaGerou(sqlGerado: string) {
    setSql(formatarSql(sqlGerado))
    setResultados(null)
    setErro(null)
  }

  function handleCarregarConsulta(sqlTexto: string) {
    setSql(formatarSql(sqlTexto))
    setResultados(null)
    setErro(null)
    setEditorVisivel(true)
  }

  async function handleDeletar(id: number) {
    await deletarConsulta(id)
    setConsultas((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleSalvar(nome: string) {
    const result = await salvarConsulta(nome, sql.trim())
    if (!result.error && result.data) {
      setConsultas((prev) => [result.data!, ...prev])
    }
    return result
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
    if (result.error) { setErro(result.error); return }
    const dados = result.data ?? []
    setResultados(dados)
    setResultadosVisiveis(true)
    setColunasVisiveis(false)
    if (dados.length > 0) {
      setColConfig(Object.keys(dados[0]).map((k) => ({ key: k, label: k, visible: true })))
    } else {
      setColConfig([])
    }
  }

  return (
    <>
      {modalIa && (
        <ModalIA pergunta={pergunta} setPergunta={setPergunta} onFechar={() => setModalIa(false)} onGerar={handleIaGerou} />
      )}
      {modalSalvar && (
        <ModalSalvar onFechar={() => setModalSalvar(false)} onSalvar={handleSalvar} />
      )}
      {painelConsultas && (
        <PainelConsultas
          consultas={consultas}
          carregando={carregandoConsultas}
          onCarregar={handleCarregarConsulta}
          onDeletar={handleDeletar}
          onFechar={() => setPainelConsultas(false)}
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
          <div className="flex items-center gap-2 flex-wrap">
            <button className="btn btn-ghost btn-sm flex items-center gap-1.5" onClick={abrirConsultas}>
              <BookOpen size={14} /> Consultas Salvas
            </button>
            <button
              className="btn btn-ghost btn-sm flex items-center gap-1.5"
              onClick={() => setModalSalvar(true)}
              disabled={!sql.trim()}
            >
              <Save size={14} /> Salvar
            </button>
            <button className="btn btn-gradient flex items-center gap-1.5" onClick={() => setModalIa(true)}>
              <Sparkles size={15} /> Assistente IA
            </button>
          </div>
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
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ borderBottom: editorVisivel ? '1px solid var(--d2b-border)' : 'none', cursor: 'pointer' }}
            onClick={() => setEditorVisivel((v) => !v)}
          >
            <FileCode2 size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Editor SQL</span>
            {sql.trim() && (
              <span className="badge badge-muted" style={{ marginLeft: 0, fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sql.trim().slice(0, 40)}{sql.trim().length > 40 ? '…' : ''}
              </span>
            )}
            <div className="flex items-center gap-1.5" style={{ marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={(e) => { e.stopPropagation(); setSql((s) => formatarSql(s)) }} disabled={!sql.trim()} title="Formatar SQL">
                <WrapText size={12} /> Formatar
              </button>
              <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={(e) => { e.stopPropagation(); if (sql) navigator.clipboard.writeText(sql) }} disabled={!sql.trim()} title="Copiar SQL">
                <Copy size={12} /> Copiar
              </button>
              <button
                className="btn btn-gradient flex items-center gap-1.5"
                onClick={(e) => { e.stopPropagation(); handleExecutar() }}
                disabled={executando || !sql.trim() || !empresa}
                title="Executar (Ctrl+Enter)"
              >
                {executando ? <><Loader2 size={13} className="animate-spin" /> Executando...</> : <><Play size={12} /> Executar</>}
              </button>
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setEditorVisivel((v) => !v) }}>
                {editorVisivel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
          </div>

          {editorVisivel && (
            <>
              <div style={{ padding: '12px 16px 8px' }}>
                <textarea
                  ref={textareaRef}
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={'SELECT *\nFROM DBAMV.MOV_ESTOQUE\nWHERE ROWNUM <= 10'}
                  spellCheck={false}
                  style={{ width: '100%', minHeight: 340, resize: 'vertical', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--d2b-border)', background: '#1a1d23', color: '#e2e8f0', fontSize: 13, fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace", lineHeight: 1.6, outline: 'none', boxSizing: 'border-box', caretColor: 'var(--brand)' }}
                />
              </div>
              <div className="table-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                <kbd style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--d2b-border)', fontSize: 10 }}>Ctrl</kbd>+
                <kbd style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--d2b-border)', fontSize: 10 }}>Enter</kbd>
                {' executa · '}
                <kbd style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--d2b-border)', fontSize: 10 }}>Tab</kbd>
                {' insere espaços'}
              </div>
            </>
          )}
        </div>

        {/* ── Erro ── */}
        {erro && (
          <div className="alert alert-danger">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {erro}
          </div>
        )}

        {/* ── Resultados ── */}
        {resultados !== null && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{ borderBottom: resultadosVisiveis ? '1px solid var(--d2b-border)' : 'none' }}
            >
              <Table2 size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--text-primary)', cursor: 'pointer' }}
                onClick={() => setResultadosVisiveis((v) => !v)}
              >
                Resultados
              </span>
              <span className={`badge ${resultados.length > 0 ? 'badge-brand' : 'badge-muted'}`}>
                {resultados.length.toLocaleString('pt-BR')}
              </span>
              {colConfig.length > 0 && (
                <span className="badge badge-muted">
                  {colConfig.filter((c) => c.visible).length}/{colConfig.length} col.
                </span>
              )}

              <div className="flex items-center gap-1.5" style={{ marginLeft: 'auto' }}>
                {resultados.length > 0 && (
                  <>
                    <button
                      className={`btn btn-ghost btn-sm flex items-center gap-1 ${colunasVisiveis ? 'btn-active' : ''}`}
                      onClick={() => setColunasVisiveis((v) => !v)}
                      style={{ fontSize: 11 }}
                    >
                      <Pencil size={11} /> Colunas
                    </button>
                    <button
                      className="btn btn-ghost btn-sm flex items-center gap-1"
                      onClick={() => exportarCsv(resultados, colConfig)}
                      style={{ fontSize: 11 }}
                    >
                      <Download size={11} /> Exportar CSV
                    </button>
                  </>
                )}
                <button className="icon-btn" onClick={() => setResultadosVisiveis((v) => !v)}>
                  {resultadosVisiveis ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            </div>

            {resultadosVisiveis && (
              <>
                {colunasVisiveis && colConfig.length > 0 && (
                  <PainelColunas colunas={colConfig} onChange={setColConfig} />
                )}
                <TabelaResultados dados={resultados} colunas={colConfig} />
              </>
            )}
          </div>
        )}

      </div>
    </>
  )
}
