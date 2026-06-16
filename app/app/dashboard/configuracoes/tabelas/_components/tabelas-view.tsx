'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Table2, Plus, Pencil, Trash2, Zap, Loader2,
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Clock, X, Search,
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

// ─── Campo ────────────────────────────────────────────────────────────────────

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

// ─── Badge status de indexação ────────────────────────────────────────────────

function BadgeIndexado({ indexadoEm }: { indexadoEm: string | null }) {
  if (indexadoEm) {
    const dt = new Date(indexadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{
          background: 'var(--success-muted)',
          color: 'var(--success)',
          border: '1px solid var(--success-border)',
        }}
      >
        <CheckCircle2 size={10} /> {dt}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
      style={{
        background: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
        border: '1px solid var(--d2b-border)',
      }}
    >
      <Clock size={10} /> Pendente
    </span>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TabelasView({ paginaInicial }: { paginaInicial: PagedResponse<TabelaRagDTO> }) {
  const [tabelas, setTabelas] = useState(paginaInicial.dados)
  const [total, setTotal] = useState(paginaInicial.total)
  const [pagina, setPagina] = useState(0)
  const tamanhoPagina = 20

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<TabelaRagDTO | null>(null)
  const [form, setForm] = useState<TabelaForm>(FORM_VAZIO)
  const [colunas, setColunas] = useState<ColForm[]>([])

  const [busca, setBusca] = useState('')
  const montado = useRef(false)

  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [indexandoTudo_, setIndexandoTudo] = useState(false)
  const [indexandoNome, setIndexandoNome] = useState<string | null>(null)

  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [erroModal, setErroModal] = useState<string | null>(null)

  // ── Debounce busca ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!montado.current) { montado.current = true; return }
    const timer = setTimeout(() => recarregar(0, busca), 350)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function limparPagina() { setSucesso(null); setErro(null) }

  async function recarregar(p: number, filtro = busca) {
    setCarregando(true)
    try {
      const res = await listarTabelas(p, tamanhoPagina, filtro)
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

  // ── Modal ──────────────────────────────────────────────────────────────────────

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
    setColunas(t.colunas.map(c => ({
      nome: c.nome,
      tipoDado: c.tipoDado ?? '',
      descricao: c.descricao ?? '',
      nullable: c.nullable,
      chavePrimaria: c.chavePrimaria,
    })))
    setErroModal(null)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
    setErroModal(null)
  }

  // ── Salvar ────────────────────────────────────────────────────────────────────

  async function handleSalvar() {
    if (!form.nome.trim()) { setErroModal('Nome é obrigatório.'); return }
    if (!form.descricao.trim()) { setErroModal('Descrição é obrigatória.'); return }

    const nomesCols = colunas.map(c => c.nome.trim().toUpperCase()).filter(Boolean)
    const dup = nomesCols.find((n, i) => nomesCols.indexOf(n) !== i)
    if (dup) { setErroModal(`Coluna duplicada: ${dup}`); return }

    setErroModal(null)
    setSalvando(true)
    const req: TabelaRagRequest = {
      nome: form.nome.trim().toUpperCase(),
      schemaOra: (form.schemaOra.trim() || 'DBAMV').toUpperCase(),
      descricao: form.descricao.trim(),
      colunas: colunas.filter(c => c.nome.trim()).map<ColunaRagRequest>(c => ({
        nome: c.nome.trim().toUpperCase(),
        ...(c.tipoDado.trim() ? { tipoDado: c.tipoDado.trim() } : {}),
        ...(c.descricao.trim() ? { descricao: c.descricao.trim() } : {}),
        nullable: c.nullable,
        chavePrimaria: c.chavePrimaria,
      })),
    }
    const result = await salvarTabela(req)
    setSalvando(false)
    if (result.error) {
      setErroModal(result.error)
      return
    }
    setSucesso(editando ? `Tabela ${req.nome} atualizada.` : `Tabela ${req.nome} cadastrada.`)
    fecharModal()
    await recarregar(pagina)
  }

  // ── Deletar ───────────────────────────────────────────────────────────────────

  async function handleDeletar(id: string, nome: string) {
    if (!confirm(`Remover a tabela ${nome}? Essa ação não pode ser desfeita.`)) return
    limparPagina()
    const result = await deletarTabela(id)
    if (result.error) { setErro(result.error); return }
    setSucesso(`Tabela ${nome} removida.`)
    await recarregar(pagina)
  }

  // ── Indexar ───────────────────────────────────────────────────────────────────

  async function handleIndexar(nome: string) {
    limparPagina()
    setIndexandoNome(nome)
    const result = await indexarTabela(nome)
    setIndexandoNome(null)
    if (result.error) { setErro(result.error); return }
    setSucesso(`Tabela ${nome} indexada com sucesso.`)
    await recarregar(pagina)
  }

  async function handleIndexarTudo() {
    if (!confirm('Reindexar todas as tabelas? Pode demorar alguns minutos.')) return
    limparPagina()
    setIndexandoTudo(true)
    const result = await indexarTudo()
    setIndexandoTudo(false)
    if (result.error) { setErro(result.error); return }
    setSucesso(`${result.data!.documentos_indexados.toLocaleString('pt-BR')} documentos indexados com sucesso.`)
  }

  // ── Colunas ───────────────────────────────────────────────────────────────────

  function adicionarColuna() { setColunas(c => [...c, { ...COL_VAZIA }]) }
  function removerColuna(i: number) { setColunas(c => c.filter((_, idx) => idx !== i)) }
  function updateColuna<K extends keyof ColForm>(i: number, campo: K, valor: ColForm[K]) {
    setColunas(c => c.map((col, idx) => idx === i ? { ...col, [campo]: valor } : col))
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="page animate-fade-up">

      {/* Cabeçalho */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-muted)' }}>
              <Table2 size={17} style={{ color: 'var(--brand)' }} />
            </div>
            Tabelas RAG
          </h1>
          <p className="page-subtitle">
            Catálogo semântico do schema DBAMV — gerencie tabelas e controle a indexação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleIndexarTudo}
            disabled={indexandoTudo_}
          >
            {indexandoTudo_
              ? <><Loader2 size={13} className="animate-spin" /> Indexando...</>
              : <><Zap size={13} /> Indexar Tudo</>}
          </button>
          <button className="btn btn-gradient" onClick={abrirModalCriar}>
            <Plus size={14} /> Nova Tabela
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="input-field" style={{ maxWidth: 360 }}>
        <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          className="bg-transparent outline-none text-sm flex-1"
          style={{ color: 'var(--text-primary)' }}
          placeholder="Filtrar por nome da tabela..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        {busca && (
          <button className="icon-btn" onClick={() => setBusca('')} style={{ padding: 2 }}>
            <X size={12} />
          </button>
        )}
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

      {/* Card principal */}
      <div className="card">
        <div className="card-p flex flex-col gap-1">

          {/* Cabeçalho da tabela */}
          <div
            className="grid gap-3 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide mb-1"
            style={{
              gridTemplateColumns: 'minmax(0,2.5fr) 5.5rem 3rem minmax(0,3fr) 9.5rem 6rem',
              color: 'var(--text-muted)',
              background: 'var(--bg-elevated)',
            }}
          >
            <span>Nome</span>
            <span>Schema</span>
            <span className="text-center">Cols</span>
            <span>Descrição</span>
            <span>Indexado em</span>
            <span />
          </div>

          {/* Estado de carregamento */}
          {carregando ? (
            <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--text-muted)' }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : tabelas.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Table2 size={32} style={{ color: 'var(--text-muted)', opacity: 0.35 }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma tabela cadastrada.</p>
              <button className="btn btn-ghost btn-sm" onClick={abrirModalCriar}>
                <Plus size={13} /> Cadastrar a primeira tabela
              </button>
            </div>
          ) : (
            <>
              {/* Linhas */}
              {tabelas.map(t => (
                <div
                  key={t.id}
                  className="grid gap-3 items-center px-3 py-2.5 rounded-lg transition-colors"
                  style={{
                    gridTemplateColumns: 'minmax(0,2.5fr) 5.5rem 3rem minmax(0,3fr) 9.5rem 6rem',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--d2b-hover)'
                    e.currentTarget.style.borderColor = 'var(--d2b-border)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = ''
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  {/* Nome */}
                  <span className="font-mono text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {t.nome}
                  </span>

                  {/* Schema */}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.schemaOra}
                  </span>

                  {/* Colunas count */}
                  <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    {t.colunas.length}
                  </span>

                  {/* Descrição */}
                  <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {t.descricao ?? '—'}
                  </span>

                  {/* Badge indexado */}
                  <BadgeIndexado indexadoEm={t.indexadoEm} />

                  {/* Ações */}
                  <div className="flex items-center gap-0.5 justify-end">
                    <button
                      className="icon-btn"
                      title="Indexar tabela"
                      onClick={() => handleIndexar(t.nome)}
                      disabled={indexandoNome === t.nome}
                      style={{ color: 'var(--brand)' }}
                    >
                      {indexandoNome === t.nome
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Zap size={14} />}
                    </button>
                    <button
                      className="icon-btn"
                      title="Editar"
                      onClick={() => abrirModalEditar(t)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Remover"
                      onClick={() => handleDeletar(t.id, t.nome)}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Rodapé: contagem + paginação */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {total.toLocaleString('pt-BR')} tabela{total !== 1 ? 's' : ''} cadastrada{total !== 1 ? 's' : ''}
          {total > tamanhoPagina && ` · Página ${pagina + 1} de ${totalPaginas}`}
        </span>

        {total > tamanhoPagina && (
          <div className="flex items-center gap-1">
            <button
              className="icon-btn"
              onClick={() => recarregar(pagina - 1, busca)}
              disabled={pagina === 0 || carregando}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="icon-btn"
              onClick={() => recarregar(pagina + 1, busca)}
              disabled={pagina >= totalPaginas - 1 || carregando}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Modal Create / Edit ─────────────────────────────────────────────────── */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={e => e.target === e.currentTarget && fecharModal()}
        >
          <div
            className="card w-full max-w-2xl mx-4 flex flex-col"
            style={{ border: '1px solid var(--d2b-border)', maxHeight: '90vh' }}
          >
            {/* Cabeçalho do modal */}
            <div
              className="card-p flex items-center justify-between border-b flex-shrink-0"
              style={{ borderColor: 'var(--d2b-border)' }}
            >
              <div className="flex items-center gap-2">
                <Table2 size={15} style={{ color: 'var(--brand)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {editando ? `Editar — ${editando.nome}` : 'Nova Tabela'}
                </span>
              </div>
              <button className="icon-btn" onClick={fecharModal}>
                <X size={15} />
              </button>
            </div>

            {/* Corpo do modal */}
            <div className="flex-1 overflow-y-auto">
              <div className="card-p flex flex-col gap-4">

                {/* Erro do modal */}
                {erroModal && (
                  <div className="alert alert-danger">
                    <AlertTriangle size={13} />
                    <span>{erroModal}</span>
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

                {editando && (
                  <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="section-label">
                      <Table2 size={12} />
                      <span>Colunas ({colunas.length})</span>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={adicionarColuna}
                    >
                      <Plus size={12} /> Adicionar
                    </button>
                  </div>

                  {colunas.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                      Nenhuma coluna adicionada.
                    </p>
                  ) : (
                    <>
                      {/* Cabeçalho das colunas */}
                      <div
                        className="grid gap-2 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          gridTemplateColumns: '2fr 1fr 2fr 2.5rem 2.5rem 1.5rem',
                          background: 'var(--bg-elevated)',
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
                      <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                        {colunas.map((col, i) => (
                          <div
                            key={i}
                            className="grid gap-2 items-center px-2 py-2 rounded"
                            style={{
                              gridTemplateColumns: '2fr 1fr 2fr 2.5rem 2.5rem 1.5rem',
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--d2b-border)',
                            }}
                          >
                            <input
                              className="bg-transparent outline-none text-xs font-mono border-b w-full"
                              style={{ borderColor: 'var(--d2b-border)', color: 'var(--text-primary)' }}
                              placeholder="NOME_COL"
                              value={col.nome}
                              onChange={e => updateColuna(i, 'nome', e.target.value)}
                            />
                            <input
                              className="bg-transparent outline-none text-xs border-b w-full"
                              style={{ borderColor: 'var(--d2b-border)', color: 'var(--text-muted)' }}
                              placeholder="VARCHAR2"
                              value={col.tipoDado}
                              onChange={e => updateColuna(i, 'tipoDado', e.target.value)}
                            />
                            <input
                              className="bg-transparent outline-none text-xs border-b w-full"
                              style={{ borderColor: 'var(--d2b-border)', color: 'var(--text-muted)' }}
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
                              className="icon-btn flex justify-center"
                              onClick={() => removerColuna(i)}
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
            </div>

            {/* Rodapé do modal */}
            <div
              className="card-p flex items-center justify-end gap-2 border-t flex-shrink-0"
              style={{ borderColor: 'var(--d2b-border)' }}
            >
              <button className="btn btn-ghost btn-sm" onClick={fecharModal}>
                Cancelar
              </button>
              <button
                className="btn btn-gradient"
                onClick={handleSalvar}
                disabled={salvando}
              >
                {salvando
                  ? <><Loader2 size={13} className="animate-spin" /> Salvando...</>
                  : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
