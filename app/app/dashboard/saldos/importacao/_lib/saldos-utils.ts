// Utilitários de saldos — sem 'use server' (funções síncronas puras)

export const MOVIMENTOS_VALIDOS = ['ENTRADA', 'BAIXA', 'DEVOLUCAO', 'TRANSFERENCIA'] as const
export type TipoMovimento = typeof MOVIMENTOS_VALIDOS[number]

export type Row = Record<string, string>

export const MOV_LABEL: Record<TipoMovimento, string> = {
  ENTRADA:       'ENTRADA',
  BAIXA:         'BAIXA',
  DEVOLUCAO:     'DEVOLUÇÃO',
  TRANSFERENCIA: 'TRANSFERÊNCIA',
}

export const MOV_BADGE_CLASS: Record<TipoMovimento, string> = {
  ENTRADA:       'badge-brand',
  BAIXA:         'badge-danger',
  DEVOLUCAO:     'badge-warning',
  TRANSFERENCIA: 'badge-purple',
}

export type LinhaProcessada = {
  raw:      Row
  idx:      number
  saldoRow: SaldoRow
  erros:    string[]
}

export function validarLinha(s: SaldoRow, isTransfItem = false): string[] {
  const erros: string[] = []
  // Itens de transferência têm saldo obrigatório mas não movimento
  if (!isTransfItem) {
    if (!s.movimento) erros.push('Movimento obrigatório')
  }
  if (!s.saldo || s.saldo.trim() === '')         erros.push('Saldo obrigatório')
  if (isNaN(Number(s.saldo?.replace(',', '.')))) erros.push('Saldo inválido (não numérico)')
  if (Number(s.saldo?.replace(',', '.')) < 0)    erros.push('Saldo não pode ser negativo')
  if (s.movimento === 'ENTRADA') {
    if (!s.estoque    || s.estoque.trim() === '')    erros.push('Estoque obrigatório para ENTRADA')
    if (!s.fornecedor || s.fornecedor.trim() === '') erros.push('Fornecedor obrigatório para ENTRADA')
    if (!s.unidade    || s.unidade.trim() === '')    erros.push('Unidade obrigatória para ENTRADA')
  }
  return erros
}

/** Normaliza um texto para comparar com os valores válidos de movimento */
function normalizarMov(v: string): string {
  return v.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

/** Dado o texto bruto da célula Movimento, retorna o valor canônico ou undefined */
export function resolverMovimento(raw?: string): TipoMovimento | undefined {
  if (!raw || raw.trim() === '') return undefined
  const n = normalizarMov(raw)
  // Aliases
  if (n === 'DEV' || n.startsWith('DEVOL')) return 'DEVOLUCAO'
  if (n === 'ENTRADA' || n === 'ENT')       return 'ENTRADA'
  if (n === 'BAIXA' || n === 'BAI')         return 'BAIXA'
  if (n === 'TRANSFERENCIA' || n === 'TRANSF' || n === 'TRANS') return 'TRANSFERENCIA'
  return undefined
}

export type SaldoRow = {
  /** CD_PRODUTO do MV */
  produto?:    string
  /** CD_ESTOQUE do MV */
  estoque?:    string
  /** CD_FORNECEDOR do MV */
  fornecedor?: string
  unidade?:    string
  /** Obrigatório */
  saldo:       string
  /** Obrigatório — valor canônico após resolução */
  movimento:   TipoMovimento | undefined
  /** Código do lote (opcional — obrigatório se produto controla lote) */
  lote?:       string
  /** Data de validade no formato DD/MM/YYYY (opcional) */
  validade?:   string
}

/**
 * Detecta colunas por nome flexível (ignora acentos, maiúsculas, caracteres especiais)
 * e normaliza uma linha bruta da planilha para SaldoRow.
 */
export function normalizarLinha(row: Record<string, string>, headers: string[]): SaldoRow {
  function find(...keys: string[]): string | undefined {
    for (const k of keys) {
      const match = headers.find(h =>
        h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '').startsWith(k)
      )
      if (match && row[match]?.trim()) return row[match].trim()
    }
    return undefined
  }

  const movRaw = find('movimento', 'mov', 'tipo', 'type')

  return {
    produto:    find('produto', 'product', 'descricao', 'desc'),
    estoque:    find('estoque', 'setor', 'stock', 'loca'),
    fornecedor: find('fornecedor', 'forn', 'supplier'),
    unidade:    find('unidade', 'und', 'unit'),
    saldo:      find('saldo', 'qtd', 'quantidade', 'qty') ?? '',
    movimento:  resolverMovimento(movRaw),
    lote:       find('lote', 'lot', 'batch'),
    validade:   find('validade', 'val', 'expiry', 'vencimento'),
  }
}

/**
 * True se a linha é uma "linha de detalhe de lote":
 * tem lote/validade mas nenhum produto — herda o produto da linha-pai anterior.
 */
export function isLoteDetalhe(s: SaldoRow): boolean {
  return !s.produto && !!s.lote
}

// ─── Agrupamento de TRANSFERÊNCIA ────────────────────────────────────────────

/**
 * Retorna para cada linha o índice do grupo de transferência ao qual pertence,
 * ou null se a linha não faz parte de nenhuma transferência.
 *
 * Regras:
 * - Linha com movimento TRANSFERENCIA é "cabeça" do grupo
 * - Múltiplos TRANSFERENCIA consecutivos = múltiplas cabeças do MESMO grupo
 *   (o grupo só fecha quando aparece outro movimento não-TRANSFERENCIA)
 * - Linhas seguintes sem movimento pertencem ao mesmo grupo
 * - O grupo termina quando aparece uma linha com movimento preenchido (não-TRANSFERENCIA)
 */
export function calcTransfGroups(linhas: LinhaProcessada[]): Map<number, number> {
  const map = new Map<number, number>() // idx -> groupIdx (idx da primeira cabeça)
  let currentGroup: number | null = null

  for (const l of linhas) {
    const mov = l.saldoRow.movimento
    if (mov === 'TRANSFERENCIA') {
      if (currentGroup === null) currentGroup = l.idx   // primeira cabeça abre o grupo
      map.set(l.idx, currentGroup)                       // cabeças adicionais entram no mesmo grupo
    } else if (mov == null && currentGroup !== null) {
      // Linha sem movimento — pertence ao grupo atual
      map.set(l.idx, currentGroup)
    } else {
      // Qualquer outro movimento encerra o grupo
      currentGroup = null
    }
  }

  return map
}

/**
 * Dado o mapa de grupos e as linhas, retorna o conjunto de índices de linhas que são
 * itens de transferência (sem movimento, pertencentes a um grupo — exclui cabeças secundárias).
 */
export function getTransfItems(transfGroups: Map<number, number>, linhas: LinhaProcessada[]): Set<number> {
  const movMap = new Map(linhas.map(l => [l.idx, l.saldoRow.movimento]))
  const s = new Set<number>()
  for (const [idx, groupIdx] of transfGroups.entries()) {
    if (idx !== groupIdx && movMap.get(idx) !== 'TRANSFERENCIA') s.add(idx)
  }
  return s
}
