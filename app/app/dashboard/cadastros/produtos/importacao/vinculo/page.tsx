import { Link2, AlertTriangle } from 'lucide-react'
import { getEmpresaAtiva } from '../actions'
import { ImportacaoTabs } from '../_components/ImportacaoTabs'
import { VinculoSusView } from './_components/vinculo-sus-view'

export default async function VinculoProdutosPage() {
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
              <Link2 size={17} style={{ color: 'var(--purple)' }} />
            </div>
            Vínculo SUS de Produtos
          </h1>
          <p className="page-subtitle">
            Vincule o código SUS de produtos antigos (pai) a produtos novos (filho) em lote
          </p>
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

      {empresaConf && <VinculoSusView />}

    </div>
  )
}
