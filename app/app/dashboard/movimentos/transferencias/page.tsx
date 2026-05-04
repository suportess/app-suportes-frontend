import { ArrowLeftRight, AlertTriangle } from 'lucide-react'
import { getEmpresaAtiva } from '../actions'
import { MovimentosView } from '../_components/movimentos-view'

export default async function TransferenciasPage() {
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
              <ArrowLeftRight size={17} style={{ color: 'var(--purple)' }} />
            </div>
            Transferência de Saldo
          </h1>
          <p className="page-subtitle">Transferência de saldo de produtos consignados entre estoques</p>
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

      {empresaConf && <MovimentosView empresaConf={empresaConf} />}

    </div>
  )
}