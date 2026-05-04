'use client'

import { useState } from 'react'
import {
  Database, Save, Trash2, Eye, EyeOff,
  CheckCircle2, AlertTriangle, ServerCrash, RefreshCw,
  Wifi, WifiOff, Clock,
} from 'lucide-react'
import type { BancoDadosDTO, BancoDadosRequest, PortalStatusDTO } from '@/lib/types'
import { salvarBancoDados, removerBancoDados } from '../actions'

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type Form = {
  dsDriver: string
  dsHost: string
  nrPorta: string
  nmBanco: string
  nmUsuario: string
  dsSenha: string
  nrMaxOpenConns: string
  nrMaxIdleConns: string
  nrConnMaxLifetime: string
  nrConnMaxIdleTime: string
}

const FORM_PADRAO: Form = {
  dsDriver: 'oracle',
  dsHost: '',
  nrPorta: '',
  nmBanco: '',
  nmUsuario: '',
  dsSenha: '',
  nrMaxOpenConns: '10',
  nrMaxIdleConns: '5',
  nrConnMaxLifetime: '90',
  nrConnMaxIdleTime: '30',
}

function bancoParaForm(b: BancoDadosDTO): Form {
  return {
    dsDriver:          b.dsDriver,
    dsHost:            b.dsHost,
    nrPorta:           String(b.nrPorta),
    nmBanco:           b.nmBanco,
    nmUsuario:         b.nmUsuario,
    dsSenha:           '',
    nrMaxOpenConns:    String(b.nrMaxOpenConns),
    nrMaxIdleConns:    String(b.nrMaxIdleConns),
    nrConnMaxLifetime: String(b.nrConnMaxLifetime),
    nrConnMaxIdleTime: String(b.nrConnMaxIdleTime),
  }
}

// ─── Campo ────────────────────────────────────────────────────────────────────

function Campo({
  label, value, onChange, placeholder = '', type = 'text', required = false, suffix,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean; suffix?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      <div className="input-field flex items-center gap-2">
        <input
          type={type}
          className="bg-transparent outline-none text-sm flex-1 w-full"
          style={{ color: 'var(--text-primary)' }}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        {suffix}
      </div>
    </div>
  )
}

function Select({
  label, value, onChange, options, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      <div className="input-field">
        <select
          className="bg-transparent outline-none text-sm w-full"
          style={{ color: 'var(--text-primary)' }}
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function BancoDadosForm({
  bancoInicial,
  statusPortal,
}: {
  bancoInicial: BancoDadosDTO | null
  statusPortal: PortalStatusDTO | null
}) {
  const [banco, setBanco] = useState<BancoDadosDTO | null>(bancoInicial)
  const [form, setForm] = useState<Form>(
    bancoInicial ? bancoParaForm(bancoInicial) : FORM_PADRAO,
  )

  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const set = (campo: keyof Form) => (v: string) => setForm(f => ({ ...f, [campo]: v }))
  function limpar() { setSucesso(null); setErro(null) }

  async function handleSalvar() {
    if (!form.nmUsuario.trim()) { setErro('Usuário é obrigatório.'); return }
    if (!form.dsSenha.trim()) { setErro('Senha é obrigatória.'); return }
    limpar()
    setSalvando(true)
    try {
      const req: BancoDadosRequest = {
        dsDriver:          form.dsDriver,
        dsHost:            form.dsHost.trim(),
        nrPorta:           Number(form.nrPorta),
        nmBanco:           form.nmBanco.trim(),
        nmUsuario:         form.nmUsuario.trim(),
        dsSenha:           form.dsSenha,
        nrMaxOpenConns:    Number(form.nrMaxOpenConns),
        nrMaxIdleConns:    Number(form.nrMaxIdleConns),
        nrConnMaxLifetime: Number(form.nrConnMaxLifetime),
        nrConnMaxIdleTime: Number(form.nrConnMaxIdleTime),
      }
      const salvo = await salvarBancoDados(req)
      setBanco(salvo)
      setForm(bancoParaForm(salvo))
      setSucesso('Banco de dados registrado com sucesso no portal.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar banco de dados.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleRemover() {
    if (!confirm('Remover a configuração do banco de dados? O portal deixará de acessar este banco.')) return
    limpar()
    setRemovendo(true)
    try {
      await removerBancoDados()
      setBanco(null)
      setForm(FORM_PADRAO)
      setSucesso('Configuração removida.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover configuração.')
    } finally {
      setRemovendo(false)
    }
  }

  function fmtData(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  function handleDriver(v: string) {
    setForm(f => ({ ...f, dsDriver: v }))
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
          <Database size={20} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Banco de Dados
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Configure a conexão com o banco de dados Oracle do cliente.
          </p>
        </div>
      </div>

      {/* Status do Portal */}
      {statusPortal ? (
        <div
          className="card p-4 flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: statusPortal.portalAtivo ? 'var(--success)' : 'var(--danger)' }}
        >
          <div className="flex items-center gap-2">
            {statusPortal.portalAtivo
              ? <Wifi size={16} style={{ color: 'var(--success)' }} />
              : <WifiOff size={16} style={{ color: 'var(--danger)' }} />
            }
            <span className="text-sm font-medium" style={{ color: statusPortal.portalAtivo ? 'var(--success)' : 'var(--danger)' }}>
              Portal {statusPortal.status}
            </span>
            {statusPortal.uptime && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock size={11} /> {statusPortal.uptime}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {statusPortal.bancoCadastrado
              ? (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                  style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
                  <CheckCircle2 size={11} /> Banco registrado no portal
                </span>
              )
              : (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  Nenhum banco registrado
                </span>
              )
            }
          </div>
        </div>
      ) : (
        <div className="card p-4 flex items-center gap-2" style={{ borderColor: 'var(--warning)' }}>
          <WifiOff size={15} style={{ color: 'var(--warning)' }} />
          <span className="text-xs" style={{ color: 'var(--warning)' }}>
            Portal indisponível — configure o domínio ngrok da empresa ativa antes de registrar o banco.
          </span>
        </div>
      )}

      {/* Se banco já está configurado: mostrar resumo + botão remover */}
      {banco ? (
        <>
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Configuração Atual
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Driver</span>
                <p className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{banco.dsDriver.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Porta</span>
                <p className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{banco.nrPorta}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Host</span>
                <p className="font-medium mt-0.5 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{banco.dsHost}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Banco / Service</span>
                <p className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{banco.nmBanco}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Usuário</span>
                <p className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{banco.nmUsuario}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Pool máx.</span>
                <p className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{banco.nrMaxOpenConns} conex.</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Atualizado</span>
                <p className="font-medium mt-0.5 text-xs" style={{ color: 'var(--text-primary)' }}>{fmtData(banco.dtAtualizacao)}</p>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {sucesso && (
            <div className="card p-3 flex items-center gap-2" style={{ borderColor: 'var(--success)' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
              <span className="text-sm" style={{ color: 'var(--success)' }}>{sucesso}</span>
            </div>
          )}
          {erro && (
            <div className="card p-3 flex items-center gap-2" style={{ borderColor: 'var(--danger)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
              <span className="text-sm" style={{ color: 'var(--danger)' }}>{erro}</span>
            </div>
          )}

          <div className="card p-3 flex items-center gap-2" style={{ borderColor: 'var(--warning)', opacity: 0.85 }}>
            <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Para alterar as configurações, remova o banco atual e cadastre novamente.
            </span>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleRemover}
              disabled={removendo}
              className="btn-danger flex items-center gap-2"
            >
              {removendo
                ? <><RefreshCw size={14} className="animate-spin" /> Removendo...</>
                : <><Trash2 size={14} /> Remover Banco</>
              }
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Alertas */}
          {sucesso && (
            <div className="card p-3 flex items-center gap-2" style={{ borderColor: 'var(--success)' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
              <span className="text-sm" style={{ color: 'var(--success)' }}>{sucesso}</span>
            </div>
          )}
          {erro && (
            <div className="card p-3 flex items-center gap-2" style={{ borderColor: 'var(--danger)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
              <span className="text-sm" style={{ color: 'var(--danger)' }}>{erro}</span>
            </div>
          )}

          {/* Formulário de cadastro */}
          <div className="card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Conexão
            </p>

            <Select
              label="Driver"
              value={form.dsDriver}
              onChange={handleDriver}
              required
              options={[
                { value: 'oracle',   label: 'Oracle' },
                { value: 'postgres', label: 'PostgreSQL' },
                { value: 'mysql',    label: 'MySQL' },
              ]}
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Campo label="Host" value={form.dsHost} onChange={set('dsHost')} required />
              </div>
              <Campo label="Porta" value={form.nrPorta} onChange={set('nrPorta')} required />
            </div>

            <Campo label="Nome do Banco / Service Name" value={form.nmBanco} onChange={set('nmBanco')} required />
            <Campo label="Usuário" value={form.nmUsuario} onChange={set('nmUsuario')} required />
            <Campo
              label="Senha"
              value={form.dsSenha}
              onChange={set('dsSenha')}
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="••••••••"
              required
              suffix={
                <button type="button" onClick={() => setMostrarSenha(v => !v)} style={{ color: 'var(--text-muted)' }}>
                  {mostrarSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />

            <p className="text-xs font-semibold uppercase tracking-wide pt-2" style={{ color: 'var(--text-muted)' }}>
              Pool de Conexões
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Máx. Conexões"      value={form.nrMaxOpenConns}    onChange={set('nrMaxOpenConns')}    />
              <Campo label="Máx. Idle"          value={form.nrMaxIdleConns}    onChange={set('nrMaxIdleConns')}    />
              <Campo label="Lifetime (seg)"     value={form.nrConnMaxLifetime} onChange={set('nrConnMaxLifetime')} />
              <Campo label="Idle Timeout (seg)" value={form.nrConnMaxIdleTime} onChange={set('nrConnMaxIdleTime')} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleSalvar}
              disabled={salvando || !statusPortal?.portalAtivo}
              className="btn-primary flex items-center gap-2"
            >
              {salvando
                ? <><RefreshCw size={14} className="animate-spin" /> Salvando...</>
                : <><Save size={14} /> Registrar Banco</>
              }
            </button>

            {!statusPortal?.portalAtivo && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <ServerCrash size={13} /> Portal offline — aguarde o ngrok estar UP
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
