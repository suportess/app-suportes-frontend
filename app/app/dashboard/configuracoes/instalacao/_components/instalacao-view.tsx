'use client'

import { useState } from 'react'
import {
  ServerCog,
  AlertTriangle,
  Download,
  RefreshCw,
  Terminal,
  Container,
  CheckCircle2,
  Info,
  ArrowRight,
  Layers,
  Database,
  Globe,
  FileCode2,
} from 'lucide-react'
import type { EmpresaDTO } from '@/lib/types'
import { gerarDockerCompose } from '../actions'

// ─── Bloco de código ──────────────────────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
      )}
      <pre
        className="rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"
        style={{
          background: 'var(--surface-2)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          border: '1px solid var(--border)',
        }}
      >
        {code}
      </pre>
    </div>
  )
}

// ─── Card de passo ────────────────────────────────────────────────────────────

function StepCard({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'var(--brand)', color: 'white' }}
        >
          {step}
        </div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
      </div>
      <div className="pl-10 space-y-3">{children}</div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function InstalacaoView({ empresaAtiva }: { empresaAtiva: EmpresaDTO | null }) {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const temPortal = !!empresaAtiva?.dsHostPortal

  async function handleDownload() {
    setErro(null)
    setBaixando(true)
    try {
      const content = await gerarDockerCompose()
      const blob = new Blob([content], { type: 'text/yaml; charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'docker-compose.yml'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar docker-compose.')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="p-6 space-y-8">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
            <ServerCog size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Instalação On-Premises
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Guia de instalação do portal no servidor do cliente via Docker Compose.
            </p>
          </div>
        </div>

        {/* Botão de download */}
        {temPortal && (
          <button
            onClick={handleDownload}
            disabled={baixando}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: baixando ? 'var(--brand)' : 'var(--brand)',
              color: 'white',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--brand) 35%, transparent)',
            }}
            onMouseEnter={e => { if (!baixando) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = '' }}
          >
            {baixando
              ? <><RefreshCw size={15} className="animate-spin" /> Gerando...</>
              : <><Download size={15} /> docker-compose.yml</>
            }
          </button>
        )}
      </div>

      {/* Alerta: empresa sem ngrok */}
      {!temPortal && (
        <div
          className="card p-4 flex items-start gap-3"
          style={{ borderColor: 'var(--warning)' }}
        >
          <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
              Domínio ngrok não configurado
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Para gerar o arquivo de instalação, é necessário primeiro configurar o domínio ngrok
              da empresa ativa em{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Configurações → Empresa
              </span>.
              O domínio é gerado automaticamente e vinculado à empresa.
            </p>
          </div>
        </div>
      )}

      {/* Erro de download */}
      {erro && (
        <div className="card p-3 flex items-center gap-2" style={{ borderColor: 'var(--danger)' }}>
          <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />
          <span className="text-sm" style={{ color: 'var(--danger)' }}>{erro}</span>
        </div>
      )}



      {/* ── DOCUMENTAÇÃO ─────────────────────────────────────────────────── */}

      {/* Visão geral */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Visão Geral
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Container,  label: 'portal' },
            { icon: Globe,      label: 'ngrok' },
            { icon: Layers,     label: 'portal-scripts' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="card p-4 flex flex-col gap-2 items-start">
              <div className="p-1.5 rounded" style={{ background: 'var(--surface-2)' }}>
                <Icon size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Passo a passo */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Passo a Passo
        </h2>

        <StepCard step={1} title="Pré-requisitos">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Instale o Docker e o Docker Compose no servidor do cliente.
          </p>
          <CodeBlock
            label="Verificar instalação"
            code={`docker --version\ndocker compose version`}
          />
          <div className="flex items-start gap-2 text-xs p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
            <Info size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)' }}>
              Docker Engine 24+ e Compose V2 (plugin) são recomendados.
            </span>
          </div>
        </StepCard>

        <StepCard step={2} title="Baixar e posicionar o arquivo">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Clique em <strong>docker-compose.yml</strong> no topo desta página para baixar o arquivo
            já configurado para esta empresa. Coloque-o em um diretório dedicado no servidor.
          </p>
          <CodeBlock
            label="Criar diretório"
            code={`mkdir -p /opt/portal\ncp docker-compose.yml /opt/portal/\ncd /opt/portal`}
          />
        </StepCard>

        <StepCard step={3} title="Subir os serviços">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Suba os contêineres em modo <em>detached</em>. O portal inicia primeiro (healthcheck),
            depois o ngrok conecta automaticamente.
          </p>
          <CodeBlock
            label="Iniciar"
            code={`docker compose up -d`}
          />
          <CodeBlock
            label="Verificar status"
            code={`docker compose ps\ndocker compose logs -f --tail=50`}
          />
        </StepCard>

        <StepCard step={4} title="Executar as migrations (primeira vez)">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Após os serviços subirem com sucesso, rode o contêiner de scripts para aplicar
            as migrations e seeds iniciais do banco SQLite.
          </p>
          <CodeBlock
            label="Rodar migrations"
            code={`docker compose run --rm portal-scripts`}
          />
          <div className="flex items-start gap-2 text-xs p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
            <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            <span style={{ color: 'var(--text-muted)' }}>
              Este comando deve ser executado <strong>uma única vez</strong>. Em atualizações,
              o portal-scripts detecta quais migrations já foram aplicadas e executa apenas as novas.
            </span>
          </div>
        </StepCard>

        <StepCard step={5} title="Verificar conectividade">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Após as migrations, verifique se o portal está respondendo pelo domínio ngrok.
            O campo <strong>status</strong> deve ser <code className="text-xs font-mono px-1 py-0.5 rounded" style={{ background: 'var(--surface-2)' }}>UP</code>.
          </p>
          {temPortal ? (
            <CodeBlock
              label="Verificar status"
              code={`curl ${empresaAtiva!.dsHostPortal}/status`}
            />
          ) : (
            <CodeBlock
              label="Verificar status"
              code={`curl https://<seu-dominio-ngrok>/status`}
            />
          )}
          <CodeBlock
            label="Resposta esperada"
            code={`{\n  "status": "UP",\n  "uptime": "...",\n  "databases": {}\n}`}
          />
        </StepCard>

        <StepCard step={6} title="Registrar o banco de dados">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Com o portal rodando, vá para{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Configurações → Banco de Dados
            </span>
            {' '}e preencha as credenciais Oracle. O sistema registrará a conexão automaticamente
            via API do portal.
          </p>
          <div className="flex items-start gap-2 text-xs p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
            <Database size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-muted)' }}>
              A chave do banco no portal é sempre <code className="font-mono">oracle-prod</code> e não
              precisa ser informada — é gerenciada automaticamente pelo sistema.
            </span>
          </div>
        </StepCard>
      </div>

      {/* Referência de comandos úteis */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Comandos Úteis
        </h2>
        <div className="card p-5 space-y-4">
          <CodeBlock
            label="Parar os serviços"
            code={`docker compose down`}
          />
          <CodeBlock
            label="Atualizar imagens"
            code={`docker compose pull\ndocker compose up -d`}
          />
          <CodeBlock
            label="Ver logs do portal"
            code={`docker compose logs portal -f`}
          />
          <CodeBlock
            label="Ver logs do ngrok"
            code={`docker compose logs portal-ngrok -f`}
          />
        </div>
      </div>

    </div>
  )
}
