import { getEmpresaAtiva } from '@/app/dashboard/movimentos/actions'
import { SqlView } from './_components/sql-view'

export default async function ConsultasSqlPage() {
  const empresa = await getEmpresaAtiva().catch(() => null)
  return <SqlView empresa={empresa} />
}
