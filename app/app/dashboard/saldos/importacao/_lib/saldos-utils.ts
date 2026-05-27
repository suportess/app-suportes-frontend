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
 * Normaliza data de validade para DD/MM/YYYY.
 * Aceita entradas comuns de planilha (DD/MM/YY, MM/DD/YY, YYYY-MM-DD, etc.).
 */
function normalizarValidade(raw?: string): string | undefined {
  if (!raw) return undefined
  const v = raw.trim()
  if (!v) return undefined

  const to4 = (y: number) => (y < 100 ? 2000 + y : y)
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const isValid = (d: number, m: number, y: number) => {
    if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return false
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false
    const dt = new Date(y, m - 1, d)
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  }
  const fmt = (d: number, m: number, y: number) => `${pad2(d)}/${pad2(m)}/${String(y)}`

  // ISO-like: YYYY-MM-DD
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const y = Number(m[1])
    const mm = Number(m[2])
    const d = Number(m[3])
    if (isValid(d, mm, y)) return fmt(d, mm, y)
  }

  // Slash format: D/M/YY(YY) or M/D/YY(YY)
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    const y = to4(Number(m[3]))

    // Se a 2a parte > 12, claramente veio como MM/DD.
    if (b > 12 && isValid(b, a, y)) return fmt(b, a, y)

    // Padrão esperado no front: DD/MM.
    if (isValid(a, b, y)) return fmt(a, b, y)

    // Fallback: tenta MM/DD quando DD/MM for inválido.
    if (isValid(b, a, y)) return fmt(b, a, y)
  }

  return v
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
    validade:   normalizarValidade(find('validade', 'val', 'expiry', 'vencimento')),
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
