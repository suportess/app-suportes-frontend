import { buscarBancoDados, buscarStatusPortal } from './actions'
import { BancoDadosForm } from './_components/banco-dados-form'

export default async function BancoDadosPage() {
  const [banco, status] = await Promise.all([
    buscarBancoDados().catch(() => null),
    buscarStatusPortal().catch(() => null),
  ])
  return <BancoDadosForm bancoInicial={banco} statusPortal={status} />
}
