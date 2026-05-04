import { getEmpresaAtiva } from './actions'
import { InstalacaoView } from './_components/instalacao-view'

export default async function InstalacaoPage() {
  const empresaAtiva = await getEmpresaAtiva().catch(() => null)
  return <InstalacaoView empresaAtiva={empresaAtiva} />
}
