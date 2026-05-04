import { listarEmpresas } from './actions'
import { EmpresaForm } from './_components/empresa-form'

export default async function EmpresaPage() {
  let empresas = await listarEmpresas().catch(() => [])

  return <EmpresaForm empresasIniciais={empresas} />
}
