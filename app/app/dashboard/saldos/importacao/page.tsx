import { TrendingUp } from 'lucide-react'
import { ImportacaoSaldosView } from './_components/importacao-saldos-view'

export default function ImportacaoSaldosPage() {
  return (
    <div className="page animate-fade-up">

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--success-muted)' }}
            >
              <TrendingUp size={17} style={{ color: 'var(--success)' }} />
            </div>
            Importação de Saldos
          </h1>
          <p className="page-subtitle">
            Importe saldos de estoque a partir de uma planilha Excel — suporta entradas e devoluções
          </p>
        </div>
      </div>

      <ImportacaoSaldosView />

    </div>
  )
}
