// ─── Usuário (Auth0 + backend) ─────────────────────────────────────────────────

export type TipoUsuario = 'OPERADOR'

export type UsuarioEmpresaDTO = {
  id: number
  empresaId: number
  nmEmpresa: string
  dtVinculo: string
}

export type UsuarioDTO = {
  id: number
  auth0Sub: string
  email: string
  nmUsuario: string | null
  picture: string | null
  tipo: TipoUsuario
  dtCriacao: string
  dtAtualizacao: string
  empresaAtiva: EmpresaDTO | null
  empresas: UsuarioEmpresaDTO[]
}

// ─── Empresa ──────────────────────────────────────────────────────────────────

export type EmpresaDTO = {
  id: number
  nmEmpresa: string
  dsRazaoSocial: string | null
  nrCnpj: string | null
  dsEmail: string | null
  nrTelefone: string | null
  apikey: string
  dsHostPortal: string | null
  snAtivo: 'S' | 'N'
  dtCriacao: string
  dtAtualizacao: string
}

export type EmpresaRequest = {
  nmEmpresa: string
  dsRazaoSocial?: string
  nrCnpj?: string
  dsEmail?: string
  nrTelefone?: string
  dsHostPortal?: string
}

// ─── Ngrok ───────────────────────────────────────────────────────────────────

export type NgrokReservedDomainDTO = {
  id: string
  domain: string
  region: string | null
  description: string | null
  createdAt: string | null
}

export type GerarNgrokResponse = {
  empresa: EmpresaDTO
  ngrokDomainId: string
}

// ─── Banco de Dados ───────────────────────────────────────────────────────────

export type BancoDadosDTO = {
  id: number
  dsDriver: string
  dsHost: string
  nrPorta: number
  nmBanco: string
  nmUsuario: string
  nrMaxOpenConns: number
  nrMaxIdleConns: number
  nrConnMaxLifetime: number
  nrConnMaxIdleTime: number
  dtCriacao: string
  dtAtualizacao: string
}

export type PortalStatusDTO = {
  portalAtivo: boolean
  status: string       // "UP" | "DOWN" | "UNKNOWN"
  uptime: string | null
  bancoCadastrado: boolean
}

export type BancoDadosRequest = {
  dsDriver: string
  dsHost: string
  nrPorta: number
  nmBanco: string
  nmUsuario: string
  dsSenha: string
  nrMaxOpenConns: number
  nrMaxIdleConns: number
  nrConnMaxLifetime: number
  nrConnMaxIdleTime: number
}

// ─── Portal MV ────────────────────────────────────────────────────────────────

export type PagedResponse<T> = {
  dados: T[]
  pagina: number
  tamanhoPagina: number
  total: number
}

/** Resposta de /mv/api/multiempresas */
export type MultiEmpresaPortalDTO = {
  CD_MULTI_EMPRESA: number
  DS_MULTI_EMPRESA: string
}

/** Resposta de /mv/api/multiempresas/{id}/estoques */
export type EstoquePortalDTO = {
  CD_ESTOQUE: string  // API retorna como string
  DS_ESTOQUE: string
}

/** Resposta de /mv/api/multiempresas/{id}/estoques/{id}/produtos */
export type ProdutoConsignadoPortalDTO = {
  CD_PRODUTO: string  // API retorna como string
  DS_PRODUTO: string
}

/** Resposta de /mv/api/estoques/{id}/produtos/{id}/entradas */
export type EntradaProdutoPortalDTO = {
  CD_ENT_PRO: string
  CD_FORNECEDOR: number
  CD_LOTE: string | null
  DT_VALIDADE: string | null
  DS_PRODUTO: string | null
  DT_ENTRADA: string
  NM_FORNECEDOR: string
  QT_DISPONIVEL: number | null
  DS_UNIDADE: string | null
  CD_UNI_PRO: string | null
}

/** Resposta de /mv/api/estoques/{id}/produtos/{id}/saldo-lote */
export type SaldoLotePortalDTO = {
  QT_ESTOQUE_ATUAL: string  // portal retorna como string
  DS_UNIDADE: string
}

/** Resposta de /mv/api/produtos/{cd_produto} */
export type ProdutoDetalhePortalDTO = {
  CD_PRODUTO: number
  DS_PRODUTO: string
  SN_LOTE: 'S' | 'N'
  SN_CONTROLE_VALIDADE: 'S' | 'N'
  SN_CONSIGNADO: 'S' | 'N'
}

/** Transferência consignada salva no backend */
export type TransferenciaConsignadoDTO = {
  id: number
  status: 'PENDENTE' | 'CONCLUIDO'
  cdMultiEmpresa: number
  cdEstoque: number
  dsEstoque: string | null
  cdProdutoDev: number
  dsProdutoDev: string | null
  cdEntPro: number
  cdLoteDev: string | null
  dtValidadeDev: string | null
  qtDevolvida: number
  cdProdutoEnt: number
  dsProdutoEnt: string | null
  cdLoteEnt: string | null
  dtValidadeEnt: string | null
  qtEntrada: number
  dtDevolucao: string
  dtCriacao: string
  dtConclusao: string | null
}

/** Corpo para criar transferência */
export type TransferenciaConsignadoRequest = Omit<
  TransferenciaConsignadoDTO,
  'id' | 'status' | 'dtCriacao' | 'dtConclusao'
>

// ─── API Response envelope ────────────────────────────────────────────────────

export type ApiResponse<T> = {
  sucesso: boolean
  mensagem: string | null
  dados: T | null
}
