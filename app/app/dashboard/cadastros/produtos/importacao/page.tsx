import { FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { getEmpresaAtiva } from './actions'
import { ImportacaoProdutosView } from './_components/importacao-produtos-view'

export default async function ImportacaoProdutosPage() {
  const empresaConf = await getEmpresaAtiva().catch(() => null)

  return (
    <div className="page animate-fade-up">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--purple-muted)' }}
            >
              <FileSpreadsheet size={17} style={{ color: 'var(--purple)' }} />
            </div>
            Importação de Produtos
          </h1>
          <p className="page-subtitle">Cadastre múltiplos produtos no MV a partir de uma planilha Excel</p>
        </div>
      </div>

      {!empresaConf && (
        <div className="alert alert-warning">
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

      {empresaConf && <ImportacaoProdutosView empresaConf={empresaConf} />}

    </div>
  )
}
