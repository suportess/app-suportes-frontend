'use client'

import { useState, useEffect } from 'react'
import {
  Landmark, Eye, EyeOff, Copy, RefreshCw, Save,
  CheckCircle2, AlertTriangle, ShieldCheck, Plus, Trash2,
  Globe, Zap, ZapOff, ExternalLink, Lock,
} from 'lucide-react'
import type { EmpresaDTO } from '@/lib/types'
import { useUsuario } from '@/components/providers/user-context'
import {
  cadastrarEmpresa,
  atualizarEmpresa,
  regenerarApikey,
  deletarEmpresa,
  gerarNgrokEmpresa,
  removerNgrokEmpresa,
} from '../actions'

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type Form = {
  nmEmpresa: string
  dsRazaoSocial: string
  nrCnpj: string
  dsEmail: string
  nrTelefone: string
}

const FORM_VAZIO: Form = {
  nmEmpresa: '', dsRazaoSocial: '', nrCnpj: '', dsEmail: '', nrTelefone: '',
}

function empresaParaForm(e: EmpresaDTO): Form {
  return {
    nmEmpresa:    e.nmEmpresa,
    dsRazaoSocial: e.dsRazaoSocial ?? '',
    nrCnpj:       e.nrCnpj        ?? '',
    dsEmail:      e.dsEmail        ?? '',
    nrTelefone:   e.nrTelefone    ?? '',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function mascaraApikey(key: string) {
  return key.slice(0, 8) + '•'.repeat(48) + key.slice(-8)
}

// ─── Campo ────────────────────────────────────────────────────────────────────

function Campo({
  label, value, onChange, placeholder = '', type = 'text', required = false, disabled = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean; disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      <div className="input-field" style={{ opacity: disabled ? 0.6 : 1 }}>
        <input
          type={type}
          disabled={disabled}
          className="bg-transparent outline-none text-sm flex-1 w-full"
          style={{ color: 'var(--text-primary)', cursor: disabled ? 'not-allowed' : 'text' }}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function EmpresaForm({ empresasIniciais }: { empresasIniciais: EmpresaDTO[] }) {
  const { usuario } = useUsuario()
  const isOperador = usuario?.tipo === 'OPERADOR'
  const [empresas, setEmpresas] = useState<EmpresaDTO[]>(empresasIniciais)
  const [selecionada, setSelecionada] = useState<EmpresaDTO | null>(empresasIniciais[0] ?? null)
  const [form, setForm] = useState<Form>(
    empresasIniciais[0] ? empresaParaForm(empresasIniciais[0]) : FORM_VAZIO,
  )
  const [modoNova, setModoNova] = useState(empresasIniciais.length === 0)

  const [mostrarApikey, setMostrarApikey] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [regenerando, setRegenerando] = useState(false)
  const [deletando, setDeletando] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // ── Ngrok domain ──
  const [ngrokDomain, setNgrokDomain] = useState<string | null>(
    empresasIniciais[0]?.dsHostPortal
      ? empresasIniciais[0].dsHostPortal.replace(/^https?:\/\//, '').replace(/\/$/, '')
      : null
  )
  const [ngrokId,     setNgrokId]     = useState<string | null>(null)
  const [ngrokCopiado,  setNgrokCopiado]  = useState(false)
  const [ngrokGerando,  setNgrokGerando]  = useState(false)
  const [ngrokApagando, setNgrokApagando] = useState(false)

  // Sincroniza ngrokDomain da empresa selecionada (fonte de verdade é o banco)
  useEffect(() => {
    if (selecionada?.dsHostPortal) {
      const host = selecionada.dsHostPortal.replace(/^https?:\/\//, '').replace(/\/$/, '')
      setNgrokDomain(host)
      try {
        const raw = localStorage.getItem('ngrok_domain')
        if (raw) {
          const parsed = JSON.parse(raw) as { id: string; domain: string }
          setNgrokId(parsed.domain === host ? parsed.id : null)
        } else {
          setNgrokId(null)
        }
      } catch { setNgrokId(null) }
    } else {
      setNgrokDomain(null)
      setNgrokId(null)
    }
  }, [selecionada])

  const set = (campo: keyof Form) => (v: string) => setForm(f => ({ ...f, [campo]: v }))

  function limparMensagens() { setSucesso(null); setErro(null) }

  function selecionarEmpresa(e: EmpresaDTO) {
    setSelecionada(e)
    setForm(empresaParaForm(e))
    setModoNova(false)
    limparMensagens()
  }

  function iniciarNova() {
    setSelecionada(null)
    setForm(FORM_VAZIO)
    setModoNova(true)
    limparMensagens()
  }

  async function handleSalvar() {
    if (!form.nmEmpresa.trim()) { setErro('Nome da empresa é obrigatório.'); return }
    limparMensagens()
    setSalvando(true)
    try {
      const req = {
        nmEmpresa:    form.nmEmpresa,
        dsRazaoSocial: form.dsRazaoSocial || undefined,
        nrCnpj:       form.nrCnpj        || undefined,
        dsEmail:      form.dsEmail        || undefined,
        nrTelefone:   form.nrTelefone    || undefined,
      }

      if (modoNova || !selecionada) {
        const nova = await cadastrarEmpresa(req)
        setEmpresas(prev => [...prev, nova])
        setSelecionada(nova)
        setModoNova(false)
        setSucesso('Empresa cadastrada com sucesso.')
      } else {
        const atualizada = await atualizarEmpresa(selecionada.id, req)
        setEmpresas(prev => prev.map(e => e.id === atualizada.id ? atualizada : e))
        setSelecionada(atualizada)
        setSucesso('Dados atualizados com sucesso.')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar empresa.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleRegenerarApikey() {
    if (!selecionada) return
    limparMensagens()
    setRegenerando(true)
    try {
      const atualizada = await regenerarApikey(selecionada.id)
      setEmpresas(prev => prev.map(e => e.id === atualizada.id ? atualizada : e))
      setSelecionada(atualizada)
      setMostrarApikey(true)
      setSucesso('API Key regenerada. Atualize o portal com a nova chave.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao regenerar API Key.')
    } finally {
      setRegenerando(false)
    }
  }

  async function handleDeletar() {
    if (!selecionada) return
    if (!confirm(`Remover "${selecionada.nmEmpresa}"? Esta ação não pode ser desfeita.`)) return
    limparMensagens()
    setDeletando(true)
    try {
      await deletarEmpresa(selecionada.id)
      const restantes = empresas.filter(e => e.id !== selecionada.id)
      setEmpresas(restantes)
      setSelecionada(restantes[0] ?? null)
      setForm(restantes[0] ? empresaParaForm(restantes[0]) : FORM_VAZIO)
      setModoNova(restantes.length === 0)
      setSucesso('Empresa removida.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover empresa.')
    } finally {
      setDeletando(false)
    }
  }

  async function handleCopiarApikey() {
    if (!selecionada) return
    await navigator.clipboard.writeText(selecionada.apikey)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function handleGerarDominio() {
    if (!selecionada) { setErro('Selecione uma empresa antes de gerar o domínio.'); return }
    setNgrokGerando(true)
    limparMensagens()
    try {
      const { empresa: atualizada, ngrokDomainId } = await gerarNgrokEmpresa(selecionada.id)
      // Persiste ngrokId no localStorage para possibilitar exclusão via API
      localStorage.setItem('ngrok_domain', JSON.stringify({ id: ngrokDomainId, domain: atualizada.dsHostPortal?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? '' }))
      setEmpresas(prev => prev.map(e => e.id === atualizada.id ? atualizada : e))
      setSelecionada(atualizada)
      setSucesso('Domínio ngrok gerado e salvo na empresa.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar domínio.')
    } finally {
      setNgrokGerando(false)
    }
  }

  async function handleApagarDominio() {
    if (!ngrokDomain) return
    const label = ngrokId
      ? 'Apagar o domínio ngrok via API? Esta ação é irversível e todos os túneis serão interrompidos.'
      : 'Remover o domínio salvo? O domínio ngrok pode precisar ser excluído manualmente no painel.'
    if (!confirm(label)) return
    setNgrokApagando(true)
    limparMensagens()
    try {
      const atualizada = await removerNgrokEmpresa(selecionada!.id, ngrokId ?? undefined)
      localStorage.removeItem('ngrok_domain')
      setEmpresas(prev => prev.map(e => e.id === atualizada.id ? atualizada : e))
      setSelecionada(atualizada)
      setSucesso('Domínio removido.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao apagar domínio.')
    } finally {
      setNgrokApagando(false)
    }
  }

  async function handleCopiarNgrok() {
    if (!ngrokDomain) return
    await navigator.clipboard.writeText(`https://${ngrokDomain}`)
    setNgrokCopiado(true)
    setTimeout(() => setNgrokCopiado(false), 2000)
  }

  const cadastrada = selecionada !== null

  return (
    <div className="page animate-fade-up">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-muted)' }}>
              <Landmark size={17} style={{ color: 'var(--brand)' }} />
            </div>
            Empresa
          </h1>
          <p className="page-subtitle">
            {cadastrada
              ? 'Configurações da empresa operadora do portal'
              : 'Nenhuma empresa cadastrada — preencha os dados abaixo para começar'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cadastrada && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--success-muted)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>
              <CheckCircle2 size={13} />
              Empresa ativa
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={iniciarNova} disabled={isOperador}>
            <Plus size={14} /> Nova Empresa
          </button>
          {cadastrada && !isOperador && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleDeletar}
              disabled={deletando}
              style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
            >
              {deletando
                ? <><RefreshCw size={13} className="animate-spin" /> Removendo…</>
                : <><Trash2 size={13} /> Remover</>
              }
            </button>
          )}
          {!isOperador && (
            <button className="btn btn-gradient btn-sm" onClick={handleSalvar} disabled={salvando}>
              {salvando
                ? <><RefreshCw size={14} className="animate-spin" /> Salvando…</>
                : <><Save size={14} /> {cadastrada ? 'Salvar' : 'Cadastrar'}</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Seletor de empresas (quando há mais de uma) */}
      {empresas.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {empresas.map(e => (
            <button
              key={e.id}
              onClick={() => selecionarEmpresa(e)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: selecionada?.id === e.id ? 'var(--brand)' : 'var(--bg-elevated)',
                color:      selecionada?.id === e.id ? '#fff' : 'var(--text-secondary)',
                border:     '1px solid var(--d2b-border)',
              }}
            >
              {e.nmEmpresa}
            </button>
          ))}
        </div>
      )}

      {/* Banner somente-leitura para OPERADOR */}
      {isOperador && (
        <div className="alert" style={{ background: 'var(--warning-muted)', border: '1px solid var(--warning-border)', color: 'var(--warning)' }}>
          <Lock size={14} />
          <span>
            Você está como <strong>OPERADOR</strong>. Esta tela está em modo somente leitura.
            Apenas administradores podem alterar configurações de empresa.
          </span>
        </div>
      )}

      {/* Alertas */}
      {sucesso && (
        <div className="alert alert-success">
          <CheckCircle2 size={15} /><span>{sucesso}</span>
        </div>
      )}
      {erro && (
        <div className="alert alert-danger">
          <AlertTriangle size={15} /><span>{erro}</span>
        </div>
      )}
      {!cadastrada && !modoNova && (
        <div className="alert alert-warning">
          <AlertTriangle size={15} />
          <span>Cadastre a empresa para habilitar a comunicação com o portal.</span>
        </div>
      )}

      {/* Card — Dados da Empresa */}
      <div className="card">
        <div className="card-p flex flex-col gap-5">

          <div className="section-label">
            <Landmark size={12} />
            <span>{modoNova ? 'Nova Empresa' : 'Dados da Empresa'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Nome da Empresa"  value={form.nmEmpresa}     onChange={set('nmEmpresa')}    placeholder="Hospital São Lucas" required disabled={isOperador} />
            <Campo label="Razão Social"      value={form.dsRazaoSocial} onChange={set('dsRazaoSocial')} placeholder="Hospital São Lucas LTDA" disabled={isOperador} />
            <Campo label="CNPJ"              value={form.nrCnpj}        onChange={set('nrCnpj')}       placeholder="00.000.000/0001-00" disabled={isOperador} />
            <Campo label="E-mail"            value={form.dsEmail}       onChange={set('dsEmail')}      placeholder="ti@empresa.com.br" type="email" disabled={isOperador} />
            <Campo label="Telefone"          value={form.nrTelefone}    onChange={set('nrTelefone')}   placeholder="(00) 0000-0000" disabled={isOperador} />
          </div>

          {cadastrada && (
            <div className="flex flex-wrap gap-4 pt-2 border-t text-xs" style={{ borderColor: 'var(--d2b-border)', color: 'var(--text-muted)' }}>
              <span>Criado em: <strong>{fmtData(selecionada.dtCriacao)}</strong></span>
              <span>Atualizado em: <strong>{fmtData(selecionada.dtAtualizacao)}</strong></span>
            </div>
          )}


        </div>
      </div>

      {/* Card — Acesso Externo (Ngrok) */}
      <div className="card">
        <div className="card-p flex flex-col gap-5">

          <div className="section-label">
            <Globe size={12} />
            <span>Acesso Externo — Ngrok Domain</span>
          </div>

          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Domínio estático público gerado via API do{' '}
            <a href="https://ngrok.com" target="_blank" rel="noreferrer"
              className="underline" style={{ color: 'var(--brand)' }}>ngrok
              <ExternalLink size={11} className="inline ml-0.5 mb-0.5" />
            </a>.
            O endereço é salvo automaticamente em{' '}
            <code className="px-1.5 py-0.5 rounded text-xs font-mono"
              style={{ background: 'var(--bg-elevated)', color: 'var(--brand)' }}>ds_host_portal</code>{' '}
            e não pode ser editado manualmente.
          </p>

          {!cadastrada && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Cadastre a empresa antes de gerar um domínio.
            </p>
          )}

          {cadastrada && !ngrokDomain && (
            <div className="flex items-center gap-3">
              <button
                className="btn btn-gradient btn-sm"
                onClick={handleGerarDominio}
                disabled={ngrokGerando || isOperador}
              >
                {ngrokGerando
                  ? <><RefreshCw size={13} className="animate-spin" /> Gerando…</>
                  : <><Zap size={13} /> Gerar Domínio via API</>
                }
              </button>
            </div>
          )}

          {cadastrada && ngrokDomain && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="input-field flex-1 font-mono text-xs" style={{ letterSpacing: '0.04em' }}>
                  <Globe size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                  <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                    https://{ngrokDomain}
                  </span>
                </div>
                <a
                  href={`https://${ngrokDomain}`}
                  target="_blank" rel="noreferrer"
                  className="icon-btn" title="Abrir domínio"
                >
                  <ExternalLink size={15} style={{ color: 'var(--text-secondary)' }} />
                </a>
                <button className="icon-btn" onClick={handleCopiarNgrok} title="Copiar URL">
                  {ngrokCopiado
                    ? <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                    : <Copy size={15} style={{ color: 'var(--text-secondary)' }} />}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg"
                style={{ background: 'var(--danger-muted, #2a1215)', border: '1px solid var(--danger-border, #5c2026)' }}>
                <p className="text-xs flex items-start gap-2" style={{ color: 'var(--danger)' }}>
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    {ngrokId
                      ? 'Apagar o domínio é irreversível via API ngrok. Todos os túneis apontados para ele irão parar.'
                      : 'Remover limpará o domínio salvo. O domínio ngrok pode precisar ser excluído manualmente no painel.'}
                  </span>
                </p>
                <button
                  className="btn btn-ghost btn-sm flex-shrink-0"
                  onClick={handleApagarDominio}
                  disabled={ngrokApagando || isOperador}
                  style={{ borderColor: 'var(--danger-border)', color: 'var(--danger)' }}
                >
                  {ngrokApagando
                    ? <><RefreshCw size={13} className="animate-spin" /> Removendo…</>
                    : <><ZapOff size={13} /> {ngrokId ? 'Apagar via API' : 'Remover Domínio'}</>
                  }
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Card — API Key */}
      {cadastrada && (
        <div className="card">
          <div className="card-p flex flex-col gap-5">

            <div className="section-label">
              <ShieldCheck size={12} />
              <span>API Key do Portal</span>
            </div>

            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Esta chave autentica a comunicação entre o BFF e o portal. Configure-a como variável de ambiente{' '}
              <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg-elevated)', color: 'var(--brand)' }}>
                PORTAL_APIKEY
              </code>.
            </p>

            <div className="flex items-center gap-2">
              <div className="input-field flex-1 font-mono text-xs" style={{ letterSpacing: '0.05em' }}>
                <ShieldCheck size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <span className="flex-1 truncate" style={{ color: mostrarApikey ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {mostrarApikey ? selecionada.apikey : mascaraApikey(selecionada.apikey)}
                </span>
              </div>
              <button className="icon-btn" onClick={() => setMostrarApikey(v => !v)}
                title={mostrarApikey ? 'Ocultar chave' : 'Revelar chave'}>
                {mostrarApikey
                  ? <EyeOff size={15} style={{ color: 'var(--text-secondary)' }} />
                  : <Eye    size={15} style={{ color: 'var(--text-secondary)' }} />
                }
              </button>
              <button className="icon-btn" onClick={handleCopiarApikey} title="Copiar chave">
                {copiado
                  ? <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                  : <Copy size={15} style={{ color: 'var(--text-secondary)' }} />
                }
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg"
              style={{ background: 'var(--warning-muted)', border: '1px solid var(--warning-border)' }}>
              <p className="text-xs flex items-start gap-2" style={{ color: 'var(--warning)' }}>
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>Ao regenerar, a chave atual será invalidada imediatamente. Atualize o portal antes de salvar.</span>
              </p>
              <button
                className="btn btn-ghost btn-sm flex-shrink-0"
                onClick={handleRegenerarApikey}
                disabled={regenerando}
                style={{ borderColor: 'var(--warning-border)', color: 'var(--warning)' }}
              >
                {regenerando
                  ? <><RefreshCw size={13} className="animate-spin" /> Regenerando…</>
                  : <><RefreshCw size={13} /> Regenerar API Key</>
                }
              </button>
            </div>

          </div>
        </div>
      )}



    </div>
  )
}
