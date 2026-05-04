'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, UserRound, Building2, Plus, Trash2, CheckCircle2,
  AlertTriangle, Loader2, X, Search, ChevronRight, ChevronLeft,
  ShieldCheck, Calendar, Mail, Link2, Link2Off,
} from 'lucide-react'
import type { UsuarioDTO, UsuarioEmpresaDTO, EmpresaDTO } from '@/lib/types'
import {
  listarUsuarios,
  vincularEmpresa,
  desvincularEmpresa,
  listarEmpresasDisponiveis,
} from '../actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function iniciais(nome: string | null, email: string) {
  if (nome && nome.trim()) {
    const parts = nome.trim().split(' ')
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
  }
  return email[0].toUpperCase()
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  usuario,
  size = 40,
}: {
  usuario: Pick<UsuarioDTO, 'picture' | 'nmUsuario' | 'email'>
  size?: number
}) {
  if (usuario.picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={usuario.picture}
        alt={usuario.nmUsuario ?? usuario.email}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
      style={{
        width: size,
        height: size,
        background: 'var(--brand-muted)',
        color: 'var(--brand)',
        border: '2px solid var(--brand-border)',
      }}
    >
      {iniciais(usuario.nmUsuario, usuario.email)}
    </div>
  )
}

// ─── Badge Tipo ───────────────────────────────────────────────────────────────

function BadgeTipo({ tipo }: { tipo: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: 'var(--brand-muted)',
        color: 'var(--brand)',
        border: '1px solid var(--brand-border)',
      }}
    >
      <ShieldCheck size={10} />
      {tipo}
    </span>
  )
}

// ─── Modal Vincular Empresa ───────────────────────────────────────────────────

function ModalVincularEmpresa({
  usuarioId,
  vinculadas,
  onClose,
  onVinculado,
}: {
  usuarioId: number
  vinculadas: UsuarioEmpresaDTO[]
  onClose: () => void
  onVinculado: (usuario: UsuarioDTO) => void
}) {
  const [empresas, setEmpresas] = useState<EmpresaDTO[]>([])
  const [filtro, setFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const [vinculando, setVinculando] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    listarEmpresasDisponiveis()
      .then(setEmpresas)
      .catch(() => setErro('Erro ao carregar empresas.'))
      .finally(() => setLoading(false))
  }, [])

  const vinculadasIds = new Set(vinculadas.map((v) => v.empresaId))

  const empresasFiltradas = empresas.filter((e) =>
    e.nmEmpresa.toLowerCase().includes(filtro.toLowerCase()),
  )

  async function handleVincular(empresaId: number) {
    setVinculando(empresaId)
    setErro(null)
    try {
      const atualizado = await vincularEmpresa(usuarioId, empresaId)
      onVinculado(atualizado)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao vincular empresa.')
    } finally {
      setVinculando(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card w-full max-w-md mx-4 flex flex-col"
        style={{ border: '1px solid var(--d2b-border)', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="card-p flex items-center justify-between border-b flex-shrink-0"
          style={{ borderColor: 'var(--d2b-border)' }}>
          <div className="flex items-center gap-2">
            <Link2 size={15} style={{ color: 'var(--brand)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Vincular Empresa
            </span>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Busca */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="input-field">
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Pesquisar empresa..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-1">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color: 'var(--text-muted)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          )}
          {erro && (
            <div className="alert alert-danger text-xs"><AlertTriangle size={13} />{erro}</div>
          )}
          {!loading && empresasFiltradas.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
              Nenhuma empresa encontrada.
            </p>
          )}
          {empresasFiltradas.map((e) => {
            const jaVinculada = vinculadasIds.has(e.id)
            return (
              <div
                key={e.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{
                  background: jaVinculada ? 'var(--success-muted)' : 'var(--bg-elevated)',
                  border: `1px solid ${jaVinculada ? 'var(--success-border)' : 'var(--d2b-border)'}`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 size={14} style={{ color: jaVinculada ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {e.nmEmpresa}
                  </span>
                </div>
                {jaVinculada ? (
                  <span className="flex items-center gap-1 text-xs font-semibold flex-shrink-0"
                    style={{ color: 'var(--success)' }}>
                    <CheckCircle2 size={13} /> Vinculada
                  </span>
                ) : (
                  <button
                    className="btn btn-gradient btn-sm flex-shrink-0"
                    disabled={vinculando === e.id}
                    onClick={() => handleVincular(e.id)}
                  >
                    {vinculando === e.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <><Plus size={12} /> Vincular</>
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Painel de Detalhe ────────────────────────────────────────────────────────

function UsuarioDetalhe({
  usuario: usuarioProp,
  onVoltar,
}: {
  usuario: UsuarioDTO
  onVoltar: () => void
}) {
  const [usuario, setUsuario] = useState(usuarioProp)
  const [showVincular, setShowVincular] = useState(false)
  const [desvinculando, setDesvinculando] = useState<number | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function mostrarSucesso(msg: string) {
    setSucesso(msg)
    setTimeout(() => setSucesso(null), 3000)
  }

  async function handleDesvincular(vinculoId: number, empresaId: number, nmEmpresa: string) {
    if (!confirm(`Desvincular "${nmEmpresa}" deste usuário?`)) return
    setDesvinculando(vinculoId)
    setErro(null)
    try {
      await desvincularEmpresa(usuario.id, empresaId)
      setUsuario((u) => ({ ...u, empresas: u.empresas.filter((v) => v.id !== vinculoId) }))
      mostrarSucesso(`Empresa "${nmEmpresa}" desvinculada.`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao desvincular empresa.')
    } finally {
      setDesvinculando(null)
    }
  }

  function handleVinculado(atualizado: UsuarioDTO) {
    setUsuario(atualizado)
    setShowVincular(false)
    mostrarSucesso('Empresa vinculada com sucesso.')
  }

  return (
    <>
      {showVincular && (
        <ModalVincularEmpresa
          usuarioId={usuario.id}
          vinculadas={usuario.empresas}
          onClose={() => setShowVincular(false)}
          onVinculado={handleVinculado}
        />
      )}

      <div className="flex flex-col gap-5">
        {/* Botão voltar */}
        <button
          className="btn self-start"
          style={{ opacity: 0.75 }}
          onClick={onVoltar}
        >
          <ChevronLeft size={14} /> Todos os Usuários
        </button>

        {/* Alertas */}
        {sucesso && (
          <div className="alert alert-success"><CheckCircle2 size={14} /><span>{sucesso}</span></div>
        )}
        {erro && (
          <div className="alert alert-danger"><AlertTriangle size={14} /><span>{erro}</span></div>
        )}

        {/* Card: dados do usuário */}
        <div className="card">
          <div className="card-p flex flex-col gap-5">
            <div className="section-label">
              <UserRound size={12} />
              <span>Dados do Usuário</span>
            </div>

            <div className="flex items-center gap-4">
              <Avatar usuario={usuario} size={56} />
              <div className="min-w-0">
                <div className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  {usuario.nmUsuario ?? '—'}
                </div>
                <div className="flex items-center gap-1.5 text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  <Mail size={12} />
                  {usuario.email}
                </div>
                <div className="mt-1.5">
                  <BadgeTipo tipo={usuario.tipo} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t text-xs"
              style={{ borderColor: 'var(--d2b-border)', color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-1.5">
                <Calendar size={11} />
                Criado em: <strong style={{ color: 'var(--text-secondary)' }}>{fmtDt(usuario.dtCriacao)}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={11} />
                Atualizado: <strong style={{ color: 'var(--text-secondary)' }}>{fmtDt(usuario.dtAtualizacao)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Card: empresas vinculadas */}
        <div className="card">
          <div className="card-p flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="section-label">
                <Building2 size={12} />
                <span>Empresas Vinculadas</span>
              </div>
              <button
                className="btn btn-gradient btn-sm"
                onClick={() => setShowVincular(true)}
              >
                <Link2 size={13} /> Vincular Empresa
              </button>
            </div>

            {usuario.empresas.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Link2Off size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Nenhuma empresa vinculada.
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Usuários do tipo OPERADOR precisam de ao menos um vínculo para acessar o sistema.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {/* Cabeçalho da tabela */}
                <div
                  className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
                >
                  <span>Empresa</span>
                  <span className="hidden sm:block">Vinculado em</span>
                  <span></span>
                </div>

                {/* Linhas */}
                {usuario.empresas.map((v) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid var(--d2b-border)', background: 'var(--bg-card)' }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--brand-muted)' }}
                      >
                        <Building2 size={12} style={{ color: 'var(--brand)' }} />
                      </div>
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {v.nmEmpresa}
                      </span>
                    </div>
                    <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                      {fmtDt(v.dtVinculo)}
                    </span>
                    <button
                      className="icon-btn flex-shrink-0"
                      title="Desvincular empresa"
                      disabled={desvinculando === v.id}
                      onClick={() => handleDesvincular(v.id, v.empresaId, v.nmEmpresa)}
                      style={{ color: 'var(--danger)' }}
                    >
                      {desvinculando === v.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function UsuariosView({ usuariosIniciais }: { usuariosIniciais: UsuarioDTO[] }) {
  const [usuarios, setUsuarios] = useState(usuariosIniciais)
  const [selecionado, setSelecionado] = useState<UsuarioDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    setLoading(true)
    try {
      const lista = await listarUsuarios()
      setUsuarios(lista)
    } catch {
      setErro('Erro ao recarregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  function abrirUsuario(u: UsuarioDTO) {
    setSelecionado(u)
  }

  function voltarParaLista() {
    setSelecionado(null)
    recarregar()
  }

  // ── Detalhe ────────────────────────────────────────────────────────────────
  if (selecionado) {
    return (
      <div className="page animate-fade-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--brand-muted)' }}>
                <Users size={17} style={{ color: 'var(--brand)' }} />
              </div>
              Usuários
            </h1>
            <p className="page-subtitle">Detalhes e vínculos de empresa</p>
          </div>
        </div>
        <UsuarioDetalhe usuario={selecionado} onVoltar={voltarParaLista} />
      </div>
    )
  }

  // ── Lista ──────────────────────────────────────────────────────────────────
  return (
    <div className="page animate-fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-muted)' }}>
              <Users size={17} style={{ color: 'var(--brand)' }} />
            </div>
            Usuários
          </h1>
          <p className="page-subtitle">Gerencie usuários e seus vínculos com empresas</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={recarregar} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          Atualizar
        </button>
      </div>

      {erro && (
        <div className="alert alert-danger"><AlertTriangle size={14} /><span>{erro}</span></div>
      )}

      {loading && usuarios.length === 0 ? (
        <div className="card">
          <div className="card-p flex items-center justify-center py-12 gap-2" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Carregando usuários...</span>
          </div>
        </div>
      ) : usuarios.length === 0 ? (
        <div className="card">
          <div className="card-p flex flex-col items-center py-12 gap-3">
            <Users size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum usuário cadastrado.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-p flex flex-col gap-1">
            {/* Cabeçalho */}
            <div
              className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide mb-1"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
            >
              <span className="w-9"></span>
              <span>Usuário</span>
              <span className="hidden sm:block">Tipo</span>
              <span className="hidden sm:block">Empresas</span>
            </div>

            {/* Linhas */}
            {usuarios.map((u) => (
              <button
                key={u.id}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-3 py-2.5 rounded-lg w-full text-left transition-colors"
                style={{ border: '1px solid transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--d2b-hover)'
                  e.currentTarget.style.borderColor = 'var(--d2b-border)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = ''
                  e.currentTarget.style.borderColor = 'transparent'
                }}
                onClick={() => abrirUsuario(u)}
              >
                <Avatar usuario={u} size={36} />

                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {u.nmUsuario ?? '—'}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {u.email}
                  </div>
                </div>

                <BadgeTipo tipo={u.tipo} />

                <div className="flex items-center gap-1.5 hidden sm:flex">
                  {u.empresas.length === 0 ? (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhuma</span>
                  ) : (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--success-muted)',
                        color: 'var(--success)',
                        border: '1px solid var(--success-border)',
                      }}
                    >
                      {u.empresas.length} {u.empresas.length === 1 ? 'empresa' : 'empresas'}
                    </span>
                  )}
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
