'use client'

import { useState } from 'react'
import {
  Table2, Plus, Pencil, Trash2, Zap, RefreshCw,
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Clock, X,
} from 'lucide-react'
import type {
  TabelaRagDTO, TabelaRagRequest, ColunaRagRequest, PagedResponse,
} from '@/lib/types'
import { listarTabelas, salvarTabela, deletarTabela, indexarTabela, indexarTudo } from '../actions'

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type ColForm = {
  nome: string
  tipoDado: string
  descricao: string
  nullable: boolean
  chavePrimaria: boolean
}

type TabelaForm = {
  nome: string
  schemaOra: string
  descricao: string
}

const COL_VAZIA: ColForm = { nome: '', tipoDado: '', descricao: '', nullable: true, chavePrimaria: false }
const FORM_VAZIO: TabelaForm = { nome: '', schemaOra: 'DBAMV', descricao: '' }

// ─── Campo / Textarea auxiliares ──────────────────────────────────────────────

function Campo({
  label, value, onChange, required = false, disabled = false, placeholder = '', mono = false,
}: {
  label: string; value: string; onChange?: (v: string) => void
  required?: boolean; disabled?: boolean; placeholder?: string; mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      <div className="input-field" style={{ opacity: disabled ? 0.55 : 1 }}>
        <input
          type="text"
          className={`bg-transparent outline-none text-sm flex-1 w-full ${mono ? 'font-mono' : ''}`}
          style={{ color: 'var(--text-primary)' }}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

function Textarea({
  label, value, onChange, required = false, rows = 3,
}: {
  label: string; value: string; onChange: (v: string) => void
  required?: boolean; rows?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      <div className="input-field">
        <textarea
          className="bg-transparent outline-none text-sm w-full resize-none"
          style={{ color: 'var(--text-primary)' }}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
        />
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TabelasView({ paginaInicial }: { paginaInicial: PagedResponse<TabelaRagDTO> }) {
  // ── Dados da lista ───────────────────────────────────────────────────────────
  const [tabelas, setTabelas] = useState(paginaInicial.dados)
  const [total, setTotal] = useState(paginaInicial.total)
  const [pagina, setPagina] = useState(0)
  const tamanhoPagina = 20

  // ── Modal ────────────────────────────────────────────────────────────────────
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<TabelaRagDTO | null>(null)
  const [form, setForm] = useState<TabelaForm>(FORM_VAZIO)
  const [colunas, setColunas] = useState<ColForm[]>([])

  // ── Estados de carregamento ──────────────────────────────────────────────────
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [indexandoTudo_, setIndexandoTudo] = useState(false)
  const [indexandoNome, setIndexandoNome] = useState<string | null>(null)

  // ── Alertas de página ────────────────────────────────────────────────────────
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // ── Erro do modal (separado para não fechar o modal ao exibir) ───────────────
  const [erroModal, setErroModal] = useState<string | null>(null)

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function limparPagina() { setSucesso(null); setErro(null) }

  function fmtData(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  async function recarregar(p: number) {
    setCarregando(true)
    try {
      const res = await listarTabelas(p, tamanhoPagina)
      setTabelas(res.dados)
      setTotal(res.total)
      setPagina(p)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar tabelas.')
    } finally {
      setCarregando(false)
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / tamanhoPagina))

  // ─── Modal ───────────────────────────────────────────────────────────────────

  function abrirModalCriar() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setColunas([])
    setErroModal(null)
    setModalAberto(true)
  }

  function abrirModalEditar(t: TabelaRagDTO) {
    setEditando(t)
    setForm({ nome: t.nome, schemaOra: t.schemaOra, descricao: t.descricao ?? '' })
    setColunas(
      t.colunas.map(c => ({
        nome: c.nome,
        tipoDado: c.tipoDado ?? '',
        descricao: c.descricao ?? '',
        nullable: c.nullable,
        chavePrimaria: c.chavePrimaria,
      })),
    )
    setErroModal(null)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
    setErroModal(null)
  }

  // ─── Salvar ──────────────────────────────────────────────────────────────────

  async function handleSalvar() {
    if (!form.nome.trim()) { setErroModal('Nome é obrigatório.'); return }
    if (!form.descricao.trim()) { setErroModal('Descrição é obrigatória.'); return }

    const nomesColunas = colunas.map(c => c.nome.trim().toUpperCase()).filter(Boolean)
    const duplicata = nomesColunas.find((n, i) => nomesColunas.indexOf(n) !== i)
    if (duplicata) { setErroModal(`Coluna duplicada: ${duplicata}`); return }

    setErroModal(null)
    setSalvando(true)
    try {
      const req: TabelaRagRequest = {
        nome: form.nome.trim().toUpperCase(),
        schemaOra: (form.schemaOra.trim() || 'DBAMV').toUpperCase(),
        descricao: form.descricao.trim(),
        colunas: colunas
          .filter(c => c.nome.trim())
          .map<ColunaRagRequest>(c => ({
            nome: c.nome.trim().toUpperCase(),
            ...(c.tipoDado.trim() ? { tipoDado: c.tipoDado.trim() } : {}),
            ...(c.descricao.trim() ? { descricao: c.descricao.trim() } : {}),
            nullable: c.nullable,
            chavePrimaria: c.chavePrimaria,
          })),
      }
      await salvarTabela(req)
      setSucesso(editando ? `Tabela ${req.nome} atualizada.` : `Tabela ${req.nome} cadastrada.`)
      fecharModal()
      await recarregar(pagina)
    } catch (e) {
      setErroModal(e instanceof Error ? e.message : 'Erro ao salvar tabela.')
    } finally {
      setSalvando(false)
    }
  }

  // ─── Deletar ─────────────────────────────────────────────────────────────────

  async function handleDeletar(id: string, nome: string) {
    if (!confirm(`Remover a tabela ${nome}? Essa ação não pode ser desfeita.`)) return
    limparPagina()
    try {
      await deletarTabela(id)
      setSucesso(`Tabela ${nome} removida.`)
      await recarregar(pagina)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover tabela.')
    }
  }

  // ─── Indexar ─────────────────────────────────────────────────────────────────

  async function handleIndexar(nome: string) {
    limparPagina()
    setIndexandoNome(nome)
    try {
      await indexarTabela(nome)
      setSucesso(`Tabela ${nome} indexada com sucesso.`)
      await recarregar(pagina)
    } catch (e) {
      setErro(e instanceof Error ? e.message : `Erro ao indexar ${nome}.`)
    } finally {
      setIndexandoNome(null)
    }
  }

  async function handleIndexarTudo() {
    if (!confirm('Reindexar todas as tabelas? Pode demorar alguns minutos.')) return
    limparPagina()
    setIndexandoTudo(true)
    try {
      const res = await indexarTudo()
      setSucesso(`${res.documentos_indexados.toLocaleString('pt-BR')} documentos indexados com sucesso.`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao indexar tabelas.')
    } finally {
      setIndexandoTudo(false)
    }
  }

  // ─── Colunas ─────────────────────────────────────────────────────────────────

  function adicionarColuna() { setColunas(c => [...c, { ...COL_VAZIA }]) }
  function removerColuna(i: number) { setColunas(c => c.filter((_, idx) => idx !== i)) }
  function updateColuna<K extends keyof ColForm>(i: number, campo: K, valor: ColForm[K]) {
    setColunas(c => c.map((col, idx) => idx === i ? { ...col, [campo]: valor } : col))
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5 max-w-6xl">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
            <Table2 size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Tabelas RAG
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Catálogo semântico do schema DBAMV — gerencie tabelas e controle a indexação para o RAG.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleIndexarTudo}
            disabled={indexandoTudo_}
            className="btn-ghost flex items-center gap-1.5 text-xs"
          >
            {indexandoTudo_
              ? <><RefreshCw size={13} className="animate-spin" /> Indexando...</>
              : <><Zap size={13} /> Indexar Tudo</>}
          </button>
          <button onClick={abrirModalCriar} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> Nova Tabela
          </button>
        </div>
      </div>

      {/* Alertas de página */}
      {sucesso && (
        <div className="card p-3 flex items-center gap-2" style={{ borderColor: 'var(--success)' }}>
          <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
          <span className="text-sm" style={{ color: 'var(--success)' }}>{sucesso}</span>
        </div>
      )}
      {erro && (
        <div className="card p-3 flex items-center gap-2" style={{ borderColor: 'var(--danger)' }}>
          <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />
          <span className="text-sm" style={{ color: 'var(--danger)' }}>{erro}</span>
        </div>
      )}

      {/* Contador */}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {total.toLocaleString('pt-BR')} tabela{total !== 1 ? 's' : ''} cadastrada{total !== 1 ? 's' : ''}
      </p>

      {/* Lista */}
      <div className="card overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : tabelas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: 'var(--text-muted)' }}>
            <Table2 size={32} className="opacity-25" />
            <span className="text-sm">Nenhuma tabela cadastrada.</span>
            <button onClick={abrirModalCriar} className="btn-ghost text-xs mt-1">
              <Plus size={12} className="inline mr-1" /> Cadastrar a primeira tabela
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Nome', 'Schema', 'Colunas', 'Descrição', 'Indexado em', ''].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabelas.map(t => (
                  <tr
                    key={t.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    className="transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t.nome}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t.schemaOra}
                    </td>
                    <td className="px-4 py-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t.colunas.length}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="line-clamp-1">{t.descricao ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {t.indexadoEm ? (
                        <span
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded w-fit whitespace-nowrap"
                          style={{ background: 'var(--success-muted)', color: 'var(--success)' }}
                        >
                          <CheckCircle2 size={11} /> {fmtData(t.indexadoEm)}
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded w-fit"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                        >
                          <Clock size={11} /> Não indexado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 justify-end">
                        <button
                          onClick={() => handleIndexar(t.nome)}
                          disabled={indexandoNome === t.nome}
                          title="Indexar tabela"
                          className="p-1.5 rounded transition-colors hover:bg-[var(--surface-2)]"
                          style={{ color: 'var(--accent)' }}
                        >
                          {indexandoNome === t.nome
                            ? <RefreshCw size={14} className="animate-spin" />
                            : <Zap size={14} />}
                        </button>
                        <button
                          onClick={() => abrirModalEditar(t)}
                          title="Editar"
                          className="p-1.5 rounded transition-colors hover:bg-[var(--surface-2)]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletar(t.id, t.nome)}
                          title="Remover"
                          className="p-1.5 rounded transition-colors hover:bg-[var(--surface-2)]"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {total > tamanhoPagina && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Página {pagina + 1} de {totalPaginas} · {total.toLocaleString('pt-BR')} tabelas
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => recarregar(pagina - 1)}
              disabled={pagina === 0 || carregando}
              className="p-1.5 rounded disabled:opacity-40 transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => recarregar(pagina + 1)}
              disabled={pagina >= totalPaginas - 1 || carregando}
              className="p-1.5 rounded disabled:opacity-40 transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Create / Edit ───────────────────────────────────────────────── */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={fecharModal}
          />

          {/* Painel */}
          <div
            className="relative z-10 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden"
            style={{ background: 'var(--surface-1)', maxHeight: '90vh' }}
          >
            {/* Cabeçalho do modal */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editando ? `Editar — ${editando.nome}` : 'Nova Tabela'}
              </h2>
              <button
                onClick={fecharModal}
                className="p-1 rounded transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Corpo do modal */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {/* Erro do modal */}
              {erroModal && (
                <div className="card p-3 flex items-center gap-2" style={{ borderColor: 'var(--danger)' }}>
                  <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
                  <span className="text-xs" style={{ color: 'var(--danger)' }}>{erroModal}</span>
                </div>
              )}

              {/* Nome + Schema */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Campo
                    label="Nome"
                    value={form.nome}
                    onChange={v => setForm(f => ({ ...f, nome: v }))}
                    required
                    disabled={!!editando}
                    placeholder="NOME_DA_TABELA"
                    mono
                  />
                </div>
                <Campo
                  label="Schema"
                  value={form.schemaOra}
                  onChange={v => setForm(f => ({ ...f, schemaOra: v }))}
                  disabled={!!editando}
                  placeholder="DBAMV"
                  mono
                />
              </div>

              {/* Aviso para edição (nome/schema são chave do upsert) */}
              {editando && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Nome e schema identificam a tabela e não podem ser alterados aqui.
                </p>
              )}

              {/* Descrição */}
              <Textarea
                label="Descrição"
                value={form.descricao}
                onChange={v => setForm(f => ({ ...f, descricao: v }))}
                required
                rows={3}
              />

              {/* Colunas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Colunas ({colunas.length})
                  </span>
                  <button
                    onClick={adicionarColuna}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{ color: 'var(--accent)', background: 'var(--accent-muted)' }}
                  >
                    <Plus size={11} /> Adicionar
                  </button>
                </div>

                {colunas.length === 0 ? (
                  <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                    Nenhuma coluna adicionada.
                  </p>
                ) : (
                  <>
                    {/* Cabeçalho das colunas */}
                    <div
                      className="grid text-[10px] font-semibold uppercase tracking-wide px-2 mb-1"
                      style={{
                        gridTemplateColumns: '2fr 1fr 2fr 2.5rem 2.5rem 1.5rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>Nome</span>
                      <span>Tipo</span>
                      <span>Descrição</span>
                      <span className="text-center">Null</span>
                      <span className="text-center">PK</span>
                      <span />
                    </div>

                    {/* Linhas das colunas */}
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                      {colunas.map((col, i) => (
                        <div
                          key={i}
                          className="grid items-center gap-1.5 px-2 py-1.5 rounded"
                          style={{
                            background: 'var(--surface-2)',
                            gridTemplateColumns: '2fr 1fr 2fr 2.5rem 2.5rem 1.5rem',
                          }}
                        >
                          <input
                            className="bg-transparent outline-none text-xs font-mono border-b"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            placeholder="NOME_COL"
                            value={col.nome}
                            onChange={e => updateColuna(i, 'nome', e.target.value)}
                          />
                          <input
                            className="bg-transparent outline-none text-xs border-b"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                            placeholder="VARCHAR2"
                            value={col.tipoDado}
                            onChange={e => updateColuna(i, 'tipoDado', e.target.value)}
                          />
                          <input
                            className="bg-transparent outline-none text-xs border-b"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                            placeholder="Descrição..."
                            value={col.descricao}
                            onChange={e => updateColuna(i, 'descricao', e.target.value)}
                          />
                          <label className="flex justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={col.nullable}
                              onChange={e => updateColuna(i, 'nullable', e.target.checked)}
                            />
                          </label>
                          <label className="flex justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={col.chavePrimaria}
                              onChange={e => updateColuna(i, 'chavePrimaria', e.target.checked)}
                            />
                          </label>
                          <button
                            onClick={() => removerColuna(i)}
                            className="flex justify-center p-0.5 rounded transition-colors hover:bg-[var(--surface-1)]"
                            style={{ color: 'var(--danger)' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Rodapé do modal */}
            <div
              className="flex items-center justify-end gap-2 px-5 py-3"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <button onClick={fecharModal} className="btn-ghost text-sm">
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {salvando
                  ? <><RefreshCw size={13} className="animate-spin" /> Salvando...</>
                  : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
