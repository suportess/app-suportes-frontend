import { listarUsuarios } from './actions'
import { UsuariosView } from './_components/usuarios-view'

export default async function UsuariosPage() {
  const usuarios = await listarUsuarios().catch(() => [])
  return <UsuariosView usuariosIniciais={usuarios} />
}
