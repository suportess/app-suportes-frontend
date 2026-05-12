import { Package, AlertTriangle } from 'lucide-react'
import { getEmpresaAtiva } from '../actions'
import { SaldoConsignadosListaView } from './_components/sc-lista-view'

export default async function SaldoConsignadosPage() {
  const empresaConf = await getEmpresaAtiva().catch(() => null)

  return (
    <div className="page animate-fade-up">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--success-muted)' }}
            >
              <Package size={17} style={{ color: 'var(--success)' }} />
            </div>
            Saldo de Consignados
          </h1>
          <p className="page-subtitle">Consulta e manipulação de saldo de produtos consignados por estoque</p>
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

      {empresaConf && <SaldoConsignadosListaView empresaConf={empresaConf} />}

    </div>
  )
}
