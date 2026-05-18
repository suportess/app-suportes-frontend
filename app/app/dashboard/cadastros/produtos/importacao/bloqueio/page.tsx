import { Lock, AlertTriangle } from 'lucide-react'
import { getEmpresaAtiva } from '../actions'
import { ImportacaoTabs } from '../_components/ImportacaoTabs'
import { BloqueioView } from './_components/bloqueio-view'

export default async function BloqueioProdutosPage() {
  const empresaConf = await getEmpresaAtiva().catch(() => null)

  return (
    <div className="page animate-fade-up">

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--purple-muted)' }}
            >
              <Lock size={17} style={{ color: 'var(--purple)' }} />
            </div>
            Bloqueio de Produtos
          </h1>
          <p className="page-subtitle">Bloqueie ou desbloqueie produtos no MV a partir de uma planilha Excel</p>
        </div>
      </div>

      <ImportacaoTabs />

      {!empresaConf && (
        <div className="alert alert-warning" style={{ marginTop: '0.75rem' }}>
          <AlertTriangle size={15} />
          <span>
            Nenhuma empresa com <strong>Host Portal</strong> configurado. Acesse{' '}
            <a
              href="/dashboard/configuracoes/empresa"
              className="underline font-semibold"
              style={{ color: 'var(--warning)' }}
            >
              Configurações &rsaquo; Empresa
            </a>{' '}
            e preencha o campo &quot;Host Portal MV&quot;.
          </span>
        </div>
      )}

      {empresaConf && <BloqueioView />}

    </div>
  )
}
