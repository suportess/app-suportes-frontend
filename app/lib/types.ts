// ─── Usuário (Auth0 + backend) ─────────────────────────────────────────────────

export type TipoUsuario = 'OPERADOR' | 'ADMIN' | string

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

/** Resposta de /mv/api/multiempresas/{id}/estoques/{id}/saldo-consignados */
export type SaldoProdutoConsignadoPortalDTO = {
  CD_PRODUTO: string
  DS_PRODUTO: string
  QT_ESTOQUE_ATUAL: number
  DS_UNI_PRO: string | null
}

/** Resposta de /mv/api/estoques/{id}/produtos/{id}/saldo-consig-forn */
export type SaldoConsigFornPortalDTO = {
  CD_MULTI_EMPRESA: number | null
  CD_ESTOQUE: number
  DS_ESTOQUE: string | null
  CD_PRODUTO: number
  DS_PRODUTO: string | null
  CD_FORNECEDOR: number
  NM_FORNECEDOR: string
  QT_SALDO_CONSIG: number | null
  QT_DISPONIVEL_ENTPRO: number | null
  SN_ENTROU_POR_ESTOQUE: 'S' | 'N'
}

export type FornecedorPortalDTO = {
  CD_FORNECEDOR: number
  NM_FORNECEDOR: string
}

// ─── Produtos MV (DBAMV) ─────────────────────────────────────────────────────

/** Retornado por GET /api/produtos (listar paginado) */
export type ProdutoMvDTO = {
  CD_PRODUTO: string
  DS_PRODUTO: string
  DS_COMERCIAL: string
  SN_LOTE: 'S' | 'N' | string
  /** Alias de SN_CONTROLE_VALIDADE */
  SN_VALIDADE: string
  SN_CONSIGNADO: 'S' | 'N' | string
  SN_MEDICAMENTO: 'S' | 'N' | string
  TP_SEXO: string
  TP_ATIVO: 'S' | 'N' | string
  DS_SUB_CLA: string | null
  CD_ESPECIE: number
  CD_CLASSE: number
  CD_SUB_CLA: number
  DS_UNIDADE_REF: string | null
}

/** Retornado por GET /api/produtos/{id}/unidades */
export type UniProPortalDTO = {
  CD_UNI_PRO: string
  CD_PRODUTO: string
  CD_UNIDADE: string
  DS_UNIDADE: string
  VL_FATOR: string
  /** R = Referencial, C = Complementar, E = Embalagem */
  TP_RELATORIOS: 'R' | 'C' | 'E' | string
  SN_ATIVO: 'S' | 'N' | string
  SN_PRESCRICAO: 'S' | 'N' | string
}

/** Retornado por GET /api/produtos/{id}/empresas */
export type EmpresaProdutoPortalDTO = {
  CD_PRODUTO: string
  CD_MULTI_EMPRESA: number
  QT_ESTOQUE_ATUAL: number | null
  QT_ESTOQUE_MINIMO: number | null
  QT_ESTOQUE_MAXIMO: number | null
  SN_ATIVO: 'S' | 'N' | string
  SN_PADRONIZADO: 'S' | 'N' | string
  SN_LOTE: 'S' | 'N' | string
  SN_CONTROLE_VALIDADE: 'S' | 'N' | string
  VL_CUSTO_MEDIO: string | null
  VL_PRECO_DE_VENDA: string | null
}

// ─── Classificação MV (Espécie / Classe / Subclasse) ─────────────────────────

/** Retornado por GET /api/produtos/unidades */
export type UnidadeMvDTO = {
  CD_UNIDADE: string
  DS_UNIDADE: string
  VL_FATOR: number
}

export type EspecieMvDTO = {
  CD_ESPECIE: number
  DS_ESPECIE: string
}

export type ClasseMvDTO = {
  CD_ESPECIE: number
  CD_CLASSE: number
  DS_CLASSE: string
}

export type SubClasseMvDTO = {
  CD_ESPECIE: number
  CD_CLASSE: number
  CD_SUB_CLA: number
  DS_SUB_CLA: string
}

// ─── API Response envelope ────────────────────────────────────────────────────

export type ApiResponse<T> = {
  sucesso: boolean
  mensagem: string | null
  dados: T | null
}

// ─── Operação Baixa Consignado ────────────────────────────────────────────────

export type OperacaoBaixaConsignadoLinhaRequest = {
  cdFornecedor: number
  nmFornecedor: string
  quantidade: number
  lote: string
  validade: string
}

export type OperacaoBaixaConsignadoItemRequest = {
  cdProduto: number
  dsProduto: string | null
  snLote: string
  snValidade: string
  linhas: OperacaoBaixaConsignadoLinhaRequest[]
}

export type OperacaoBaixaConsignadoOrigemRequest = {
  cdProduto: number
  dsProduto: string | null
  qtEstoqueAtual: number | null
}

export type OperacaoBaixaConsignadoRequest = {
  cdMultiEmpresa: number
  cdEstoque: number
  dsEstoque: string | null
  origens: OperacaoBaixaConsignadoOrigemRequest[]
  itens: OperacaoBaixaConsignadoItemRequest[]
}

export type OperacaoBaixaConsignadoLinhaDTO = {
  id: number
  cdFornecedor: number
  nmFornecedor: string | null
  quantidade: number
  lote: string | null
  validade: string | null
}

export type OperacaoBaixaConsignadoItemDTO = {
  id: number
  cdProduto: number
  dsProduto: string | null
  snLote: string
  snValidade: string
  linhas: OperacaoBaixaConsignadoLinhaDTO[]
}

export type OperacaoBaixaConsignadoOrigemDTO = {
  id: number
  cdProduto: number
  dsProduto: string | null
  qtEstoqueAtual: number | null
}

export type OperacaoBaixaConsignadoDTO = {
  id: number
  empresaId: number
  cdMultiEmpresa: number
  cdEstoque: number
  dsEstoque: string | null
  status: 'PENDENTE' | 'CONCLUIDO'
  dtCriacao: string
  dtConclusao: string | null
  origens: OperacaoBaixaConsignadoOrigemDTO[]
  itens: OperacaoBaixaConsignadoItemDTO[]
}
