'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, AlertCircle, Loader2, TrendingUp, ChevronLeft, XCircle, CheckCircle2, Clock, X, RotateCcw } from 'lucide-react'
import {
  consultarSaldos, importarSaldos, devolverItem, transferirGrupo,
  type ParseResult, type SaldoItemPayload, type ConsultaResultItem, type DevolverItemResult,
  type TransferenciaGrupoPayload,
} from '../actions'
import {
  normalizarLinha, validarLinha, calcTransfGroups, getTransfItems,
  MOVIMENTOS_VALIDOS, MOV_LABEL, MOV_BADGE_CLASS, isLoteDetalhe,
  type TipoMovimento, type LinhaProcessada,
} from '../_lib/saldos-utils'

// ─── MovimentoSelect ─────────────────────────────────────────────────────────

function MovimentoSelect({
  value, onChange,
}: {
  value: TipoMovimento | undefined
  onChange: (v: TipoMovimento) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value as TipoMovimento)}
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.03em',
        padding: '2px 6px',
        borderRadius: 4,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        width: '100%',
        minWidth: 0,
      }}
    >
      {MOVIMENTOS_VALIDOS.map(m => (
        <option key={m} value={m}>{MOV_LABEL[m]}</option>
      ))}
    </select>
  )
}

// ─── ResumoBar ───────────────────────────────────────────────────────────────

function ResumoBar({
  total, validas, selecionadas, comErro, countMov,
}: {
  total: number
  validas: number
  selecionadas: number
  comErro: number
  countMov: (tipo: TipoMovimento) => number
}) {
  return (
    <div className="card card-p py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {([
        { label: 'Total',        value: total,        color: 'var(--brand)'              },
        { label: 'Válidas',      value: validas,      color: 'var(--success)'             },
        { label: 'Selecionadas', value: selecionadas, color: 'var(--info, var(--brand))'  },
        { label: 'Com erro',     value: comErro,      color: 'var(--danger)'              },
      ] as const).map(({ label, value, color }) => (
        <span key={label} className="flex items-center gap-1 text-xs">
          <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
          <span style={{ fontWeight: 700, color }}>{value}</span>
        </span>
      ))}
      <span style={{ color: 'var(--border)' }}>|</span>
      {MOVIMENTOS_VALIDOS.map(mov => {
        const n = countMov(mov)
        if (n === 0) return null
        return (
          <span
            key={mov}
            className={MOV_BADGE_CLASS[mov]}
            style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 4 }}
          >
            {MOV_LABEL[mov]}: {n}
          </span>
        )
      })}
    </div>
  )
}

// ─── EtapaRevisao ─────────────────────────────────────────────────────────────

export function EtapaRevisao({
  resultado,
  onBack,
  onImportado,
  onNovaImportacao,
}: {
  resultado: Extract<ParseResult, { ok: true }>
  onBack: () => void
  onImportado: (total: number) => void
  onNovaImportacao: () => void
}) {
  const [busca,        setBusca]        = useState('')
  const [importing,    setImporting]    = useState(false)
  const [importado,    setImportado]    = useState(false)
  const [erroImport,   setErroImport]   = useState<string | null>(null)
  const [saldoMap,     setSaldoMap]     = useState<Map<string, ConsultaResultItem>>(new Map())
  const [loadingSaldo, setLoadingSaldo] = useState(true)
  const [movOverrides, setMovOverrides] = useState<Map<number, TipoMovimento>>(() => new Map())

  // ── Status por linha durante importação ──────────────────────────────────
  type LineStatus = 'idle' | 'running' | 'ok' | 'parcial' | 'erro' | 'ignorado'
  const [lineStatus,  setLineStatus]  = useState<Map<number, LineStatus>>(() => new Map())
  const [lineResults, setLineResults] = useState<Map<number, DevolverItemResult>>(() => new Map())
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const sessaoRef = useRef<number | undefined>(undefined)
  type ModalItem = { l: LinhaProcessada; result: DevolverItemResult }
  const [modalItem, setModalItem] = useState<ModalItem | null>(null)
  const [selected,     setSelected]     = useState<Set<number>>(() => {
    const s = new Set<number>()
    resultado.rows.forEach((raw, idx) => {
      const sr = normalizarLinha(raw, resultado.headers)
      const isItem = idx > 0 // será recalculado; usa validação básica inicialmente
      if (validarLinha(sr, isItem).length === 0) s.add(idx)
    })
    return s
  })

  const linhas: LinhaProcessada[] = resultado.rows.map((raw, idx) => {
    const saldoRow = normalizarLinha(raw, resultado.headers)
    return { raw, idx, saldoRow, erros: validarLinha(saldoRow) }
  })

  // Grupos de TRANSFERÊNCIA: calcula após ter todas as linhas normalizadas
  const transfGroups = calcTransfGroups(linhas)
  const transfItems  = getTransfItems(transfGroups, linhas)

  // Re-valida itens de transferência (sem exigir movimento)
  const linhasComValidade: LinhaProcessada[] = linhas.map(l =>
    transfItems.has(l.idx)
      ? { ...l, erros: validarLinha(l.saldoRow, true) }
      : l
  )

  const linhasValidas   = linhasComValidade.filter(l => l.erros.length === 0)
  const linhasInvalidas = linhasComValidade.filter(l => l.erros.length > 0)

  // Consulta saldos ao entrar na revisão (uma vez por combinação única)
  useEffect(() => {
    type ItemKey = { cdProduto: string; cdEstoque?: string; cdFornecedor?: string }
    const seen = new Set<string>()
    const itens: ItemKey[] = []
    for (const l of linhasComValidade) {
      const cd = l.saldoRow.produto
      if (!cd) continue
      const key = `${cd}-${l.saldoRow.estoque ?? ''}-${l.saldoRow.fornecedor ?? ''}`
      if (!seen.has(key)) {
        seen.add(key)
        itens.push({ cdProduto: cd, cdEstoque: l.saldoRow.estoque, cdFornecedor: l.saldoRow.fornecedor })
      }
    }
    if (itens.length === 0) { setLoadingSaldo(false); return }

    setLoadingSaldo(true)
    consultarSaldos(
      itens.map(i => ({ cdProduto: i.cdProduto, cdEstoque: i.cdEstoque, cdFornecedor: i.cdFornecedor }))
    ).then(res => {
      if (res.ok) {
        const m = new Map<string, ConsultaResultItem>()
        for (const item of res.itens) {
          const cdEst  = item.CD_ESTOQUE      ? String(item.CD_ESTOQUE)      : ''
          const cdForn = item.CD_FORNECEDOR   ? String(item.CD_FORNECEDOR)   : ''
          m.set(`${item.CD_PRODUTO}-${cdEst}-${cdForn}`, item)
          if (!m.has(String(item.CD_PRODUTO))) m.set(String(item.CD_PRODUTO), item)
        }
        setSaldoMap(m)
      }
    }).finally(() => setLoadingSaldo(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Movimento efetivo (override ou original da planilha)
  const effMov = (l: LinhaProcessada): TipoMovimento | undefined =>
    movOverrides.get(l.idx) ?? l.saldoRow.movimento

  // Linhas selecionadas e válidas que serão importadas
  const linhasParaImportar = linhasValidas.filter(l => selected.has(l.idx))

  const countMov = (tipo: TipoMovimento) =>
    linhasParaImportar.filter(l => effMov(l) === tipo).length

  // Lookup de saldo por linha
  const getSaldo = (l: LinhaProcessada) =>
    l.saldoRow.produto
      ? saldoMap.get(`${l.saldoRow.produto}-${l.saldoRow.estoque ?? ''}-${l.saldoRow.fornecedor ?? ''}`)
        ?? saldoMap.get(l.saldoRow.produto)
      : undefined

  // Filtro com suporte a nomes do MV
  const visiveis = busca.trim()
    ? (() => {
        const q = busca.toLowerCase().trim()
        return linhasComValidade.filter(l => {
          const info = getSaldo(l)
          const dsEstoque = info?.DS_ESTOQUE
            ?? info?.SALDO_ESTOQUE?.find(e => String(e.CD_ESTOQUE) === l.saldoRow.estoque)?.DS_ESTOQUE
            ?? info?.SALDO_ESTOQUE?.[0]?.DS_ESTOQUE
          const nmFornecedor = info?.NM_FORNECEDOR
            ?? info?.SALDO_CONSIG_FORN?.find(f => String(f.CD_FORNECEDOR) === l.saldoRow.fornecedor)?.NM_FORNECEDOR
            ?? info?.SALDO_CONSIG_FORN?.[0]?.NM_FORNECEDOR
          return [
            l.saldoRow.produto, l.saldoRow.estoque, l.saldoRow.fornecedor,
            info?.DS_PRODUTO, dsEstoque, nmFornecedor,
          ].some(v => v?.toLowerCase().includes(q))
        })
      })()
    : linhasComValidade

  async function handleImportar() {
    setImporting(true)
    setErroImport(null)
    setLineStatus(new Map())
    setLineResults(new Map())
    sessaoRef.current = undefined

    const linhasDev   = linhasParaImportar.filter(l => effMov(l) === 'DEVOLUCAO' || effMov(l) === 'ENTRADA')
    // Um "grupo" é identificado pelo idx da primeira cabeça (transfGroups.get(l.idx) === l.idx)
    const transfHeads = linhasParaImportar.filter(l =>
      effMov(l) === 'TRANSFERENCIA' && transfGroups.get(l.idx) === l.idx
    )
    const linhasOut   = linhasParaImportar.filter(l => {
      const m = effMov(l)
      return m !== 'DEVOLUCAO' && m !== 'ENTRADA' && m !== 'TRANSFERENCIA' && !transfItems.has(l.idx)
    })

    let totalOk = 0
    let totalErro = 0

    const opTotal = linhasDev.length + transfHeads.length + linhasOut.length
    setImportProgress({ done: 0, total: opTotal })

    // ── 1. Devoluções / Entradas — linha a linha ────────────────────────────
    for (let i = 0; i < linhasDev.length; i++) {
      const l = linhasDev[i]
      const info = getSaldo(l)

      setLineStatus(prev => new Map(prev).set(l.idx, 'running'))

      const res = await devolverItem({
        cdSessao:       sessaoRef.current,
        nrLinha:        l.idx + 1,
        cdProduto:      l.saldoRow.produto!,
        dsProduto:      info?.DS_PRODUTO,
        cdEstoque:      l.saldoRow.estoque,
        dsEstoque:      info?.DS_ESTOQUE
                          ?? info?.SALDO_ESTOQUE?.find(e => String(e.CD_ESTOQUE) === l.saldoRow.estoque)?.DS_ESTOQUE,
        cdFornecedor:   l.saldoRow.fornecedor,
        nmFornecedor:   info?.NM_FORNECEDOR
                          ?? info?.SALDO_CONSIG_FORN?.find(f => String(f.CD_FORNECEDOR) === l.saldoRow.fornecedor)?.NM_FORNECEDOR,
        cdUnidade:      l.saldoRow.unidade ?? info?.CD_UNIDADE,
        dsUnidade:      info?.DS_UNIDADE,
        qtDevolvida:    Number(l.saldoRow.saldo.replace(',', '.')),
        tpMovimento:    effMov(l)!,
        saldoEstoque:   info?.TOTAL_ESTOQUE,
        saldoFicha:     info?.TOTAL_FICHA_ESTOQUE,
        saldoConsigForn: info?.TOTAL_CONSIG_FORN,
        saldoLotes:     info?.TOTAL_LOTES,
      })

      // Captura sessão na primeira resposta
      if (res.ok && res.cdSessao && !sessaoRef.current) {
        sessaoRef.current = res.cdSessao
      }

      const st: LineStatus = !res.ok
        ? 'erro'
        : res.status === 'erro'
          ? 'erro'
          : res.status === 'ignorado'
            ? 'ignorado'
            : (res.qtNaoAtendida ?? 0) > 0
              ? 'parcial'
              : 'ok'

      if (st === 'ok' || st === 'parcial') totalOk++
      else if (st === 'erro') totalErro++

      setLineStatus(prev => new Map(prev).set(l.idx, st))
      setLineResults(prev => new Map(prev).set(l.idx, res))
      setImportProgress({ done: i + 1, total: opTotal })
    }

    // ── 2. Transferências — por grupo (N cabeças + M filhos) ───────────────
    for (let gi = 0; gi < transfHeads.length; gi++) {
      const head = transfHeads[gi]
      const headGroupIdx = transfGroups.get(head.idx)! // == head.idx (primeira cabeça)

      // Todas as cabeças do grupo (TRANSFERENCIA, selecionadas, válidas)
      const groupCabecas = linhasValidas.filter(l =>
        transfGroups.get(l.idx) === headGroupIdx && effMov(l) === 'TRANSFERENCIA' && selected.has(l.idx)
      )
      // Filhos do grupo (sem movimento, selecionados, válidos)
      const groupItems = linhasValidas.filter(l =>
        transfGroups.get(l.idx) === headGroupIdx && transfItems.has(l.idx) && selected.has(l.idx)
      )

      // Marca running em todas as cabeças e em todos os filhos
      setLineStatus(prev => {
        const n = new Map(prev)
        groupCabecas.forEach(l => n.set(l.idx, 'running'))
        groupItems.forEach(l => n.set(l.idx, 'running'))
        return n
      })

      const firstCab = groupCabecas[0]
      const firstCabInfo = getSaldo(firstCab)
      const payload: TransferenciaGrupoPayload = {
        // Metadata para histórico
        cdSessao:    sessaoRef.current ?? undefined,
        nrLinha:     firstCab?.idx,
        cdProduto:   firstCab?.saldoRow.produto ?? undefined,
        dsProduto:   firstCabInfo?.DS_PRODUTO ?? null,
        cdEstoque:   firstCab?.saldoRow.estoque ?? null,
        dsEstoque:   firstCabInfo?.DS_ESTOQUE
                       ?? firstCabInfo?.SALDO_ESTOQUE?.find((e: Record<string,unknown>) => String(e.CD_ESTOQUE) === firstCab?.saldoRow.estoque)?.DS_ESTOQUE as string | undefined
                       ?? null,
        cdFornecedor: firstCab?.saldoRow.fornecedor ?? null,
        nmFornecedor: firstCabInfo?.NM_FORNECEDOR
                        ?? firstCabInfo?.SALDO_CONSIG_FORN?.find((f: Record<string,unknown>) => String(f.CD_FORNECEDOR) === firstCab?.saldoRow.fornecedor)?.NM_FORNECEDOR as string | undefined
                        ?? null,
        cdUnidade:   firstCab?.saldoRow.unidade ?? firstCabInfo?.CD_UNIDADE ?? null,
        dsUnidade:   firstCabInfo?.DS_UNIDADE ?? null,
        cabecas: groupCabecas.map(cab => {
          const cabInfo = getSaldo(cab)
          return {
            cdProduto:    Number(cab.saldoRow.produto!),
            qtDev:        Number(cab.saldoRow.saldo.replace(',', '.')),
            cdEstoque:    Number(cab.saldoRow.estoque!),
            cdFornecedor: cab.saldoRow.fornecedor ? Number(cab.saldoRow.fornecedor) : undefined,
            cdMotDev:     8,
            nrLinha:      cab.idx,
            dsProduto:    cabInfo?.DS_PRODUTO ?? null,
            dsEstoque:    cabInfo?.DS_ESTOQUE
                            ?? cabInfo?.SALDO_ESTOQUE?.find((e: Record<string,unknown>) => String(e.CD_ESTOQUE) === cab.saldoRow.estoque)?.DS_ESTOQUE as string | undefined
                            ?? null,
            nmFornecedor: cabInfo?.NM_FORNECEDOR
                            ?? cabInfo?.SALDO_CONSIG_FORN?.find((f: Record<string,unknown>) => String(f.CD_FORNECEDOR) === cab.saldoRow.fornecedor)?.NM_FORNECEDOR as string | undefined
                            ?? null,
            cdUnidade:    cab.saldoRow.unidade ?? cabInfo?.CD_UNIDADE ?? null,
            dsUnidade:    cabInfo?.DS_UNIDADE ?? null,
          }
        }),
        itens: (() => {
          // Expande sub-rows de lote: linhas sem produto mas com lote herdam
          // produto/estoque/fornecedor/unidade da linha-pai anterior.
          // A linha-pai que possui sub-rows é omitida (a qtd real fica nas sub-rows).
          type ExpandedItem = {
            l: LinhaProcessada
            effProduto: string
            effEstoque: string
            effFornecedor: string
            effUnidade?: string
          }

          // 1ª passagem: detectar quais linhas-pai têm sub-rows de lote
          const paisComSubRows = new Set<number>()
          let lastPaiIdx: number | null = null
          for (const l of groupItems) {
            if (isLoteDetalhe(l.saldoRow)) {
              if (lastPaiIdx !== null) paisComSubRows.add(lastPaiIdx)
            } else {
              lastPaiIdx = l.idx
            }
          }

          // 2ª passagem: expandir
          const expanded: ExpandedItem[] = []
          let lastPai: LinhaProcessada | null = null
          for (const l of groupItems) {
            if (isLoteDetalhe(l.saldoRow)) {
              if (!lastPai) continue // sub-row sem pai → ignora
              expanded.push({
                l,
                effProduto:    lastPai.saldoRow.produto    ?? '',
                effEstoque:    l.saldoRow.estoque  ?? lastPai.saldoRow.estoque  ?? firstCab?.saldoRow.estoque  ?? '',
                effFornecedor: l.saldoRow.fornecedor ?? lastPai.saldoRow.fornecedor ?? firstCab?.saldoRow.fornecedor ?? '',
                effUnidade:    l.saldoRow.unidade ?? lastPai.saldoRow.unidade,
              })
            } else {
              if (!paisComSubRows.has(l.idx)) {
                // Linha normal sem sub-rows — inclui diretamente
                expanded.push({
                  l,
                  effProduto:    l.saldoRow.produto    ?? '',
                  effEstoque:    l.saldoRow.estoque    ?? firstCab?.saldoRow.estoque  ?? '',
                  effFornecedor: l.saldoRow.fornecedor ?? firstCab?.saldoRow.fornecedor ?? '',
                  effUnidade:    l.saldoRow.unidade,
                })
              }
              lastPai = l
            }
          }

          return expanded.map(({ l, effProduto, effEstoque, effFornecedor, effUnidade }) => {
            const itemInfo = saldoMap.get(`${effProduto}-${effEstoque}-${effFornecedor}`)
                          ?? saldoMap.get(effProduto)
            const cdUni  = effUnidade ?? itemInfo?.CD_UNIDADE ?? ''
            return {
              cdProduto:    Number(effProduto),
              qtEntrada:    Number(l.saldoRow.saldo.replace(',', '.')),
              cdEstoque:    Number(effEstoque),
              cdFornecedor: Number(effFornecedor),
              cdUnidade:    cdUni,
              cdLote:       l.saldoRow.lote     ?? null,
              dtValidade:   l.saldoRow.validade ?? null,
              nrLinha:      l.idx,
              dsProduto:    itemInfo?.DS_PRODUTO ?? null,
              dsEstoque:    itemInfo?.DS_ESTOQUE ?? null,
              nmFornecedor: itemInfo?.NM_FORNECEDOR ?? null,
              dsUnidade:    itemInfo?.DS_UNIDADE ?? null,
            }
          })
        })(),
      }

      const res = await transferirGrupo(payload)

      // Captura sessão do retorno (pode vir de TRANSFERENCIA também)
      if (res.ok && res.cdSessao && !sessaoRef.current) {
        sessaoRef.current = res.cdSessao
      }

      const st: LineStatus = !res.ok ? 'erro' : res.status === 'erro' ? 'erro' : 'ok'
      if (st === 'ok') totalOk++
      else totalErro++

      setLineStatus(prev => {
        const n = new Map(prev)
        groupCabecas.forEach(l => n.set(l.idx, st))
        groupItems.forEach(l => n.set(l.idx, st))
        return n
      })
      setLineResults(prev => {
        const n = new Map(prev)
        groupCabecas.forEach(l => n.set(l.idx, res))
        groupItems.forEach(l => n.set(l.idx, res))
        return n
      })
      setImportProgress({ done: linhasDev.length + gi + 1, total: opTotal })
    }

    // ── 3. Outros movimentos — envio em lote ───────────────────────────────
    if (linhasOut.length > 0) {
      const itens: SaldoItemPayload[] = linhasOut
        .filter(l => effMov(l) !== undefined)
        .map(l => ({
          produto:    l.saldoRow.produto,
          estoque:    l.saldoRow.estoque,
          fornecedor: l.saldoRow.fornecedor,
          unidade:    l.saldoRow.unidade,
          saldo:      l.saldoRow.saldo,
          movimento:  effMov(l)!,
        }))
      const res = await importarSaldos(itens)
      if (!res.ok) {
        setErroImport(res.erro)
      } else {
        totalOk += res.importados
      }
    }

    setImporting(false)
    setImportado(true)
    if (totalErro === 0 && linhasOut.length === 0) {
      // Tudo foram devoluções/transferências — mostrar resumo inline
    } else if (totalErro === 0) {
      onImportado(totalOk)
    }
  }

  return (
    <div className="flex flex-col gap-3">

      <ResumoBar
        total={linhas.length}
        validas={linhasValidas.length}
        selecionadas={linhasParaImportar.length}
        comErro={linhasInvalidas.length}
        countMov={countMov}
      />

      {linhasInvalidas.length > 0 && (
        <div className="alert alert-warning">
          <AlertTriangle size={14} />
          <span>
            <strong>{linhasInvalidas.length}</strong> linha(s) com erro serão ignoradas.
            Passe o mouse sobre o ícone <strong>✗</strong> para ver o detalhe.
          </span>
        </div>
      )}
      {erroImport && (
        <div className="alert alert-danger">
          <AlertTriangle size={14} />
          <span>{erroImport}</span>
        </div>
      )}

      {/* Tabela */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <TrendingUp size={13} style={{ color: 'var(--success)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Linhas da planilha</span>
          <span className="badge badge-brand">{linhas.length}</span>
          {loadingSaldo && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <Loader2 size={11} className="animate-spin" /> buscando saldos…
            </span>
          )}
          <div className="flex-1" />
          <input
            className="input-field text-xs"
            style={{ width: 200 }}
            placeholder="Filtrar produto, estoque…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div className="overflow-auto" style={{ maxHeight: 520 }}>
          {(() => {
            const visiveisValidas = visiveis.filter(l => l.erros.length === 0)
            const allChecked = visiveisValidas.length > 0 && visiveisValidas.every(l => selected.has(l.idx))
            const someChecked = !allChecked && visiveisValidas.some(l => selected.has(l.idx))
            const toggleAll = () => {
              setSelected(prev => {
                const next = new Set(prev)
                if (allChecked) visiveisValidas.forEach(l => next.delete(l.idx))
                else            visiveisValidas.forEach(l => next.add(l.idx))
                return next
              })
            }
            const toggleOne = (idx: number) => {
              setSelected(prev => {
                const next = new Set(prev)
                if (next.has(idx)) next.delete(idx)
                else               next.add(idx)
                return next
              })
            }

            return (
              <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ width: 32, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={el => { if (el) el.indeterminate = someChecked }}
                        onChange={toggleAll}
                        title="Selecionar / desmarcar todos visíveis"
                      />
                    </th>
                    <th rowSpan={2} style={{ width: 32 }}>#</th>
                    <th rowSpan={2}>Produto</th>
                    <th rowSpan={2} style={{ width: '17%' }}>Estoque</th>
                    <th rowSpan={2} style={{ width: '17%' }}>Fornecedor</th>
                    <th rowSpan={2} style={{ width: 60 }}>Unidade</th>
                    <th rowSpan={2} style={{ width: 80, textAlign: 'right' }}>Quantidade</th>
                    <th rowSpan={2} style={{ width: 170, textAlign: 'center' }}>Movimento</th>
                    <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Saldo MV</th>
                    <th rowSpan={2} style={{ width: 28 }}></th>
                  </tr>
                  <tr>
                    <th style={{ width: 60, textAlign: 'right' }}>Est.</th>
                    <th style={{ width: 60, textAlign: 'right' }}>Ficha</th>
                    <th style={{ width: 55, textAlign: 'right' }}>Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map(l => {
                    const info      = getSaldo(l)
                    const hasErro   = l.erros.length > 0

                    // ── Transferência ─────────────────────────────────────
                    const groupIdx     = transfGroups.get(l.idx)
                    const isTransfHead    = l.saldoRow.movimento === 'TRANSFERENCIA'
                    const isTransfItem    = transfItems.has(l.idx)
                    const isLoteDetalheRow = isTransfItem && isLoteDetalhe(l.saldoRow)
                    const isInTransf   = isTransfHead || isTransfItem
                    const groupMembers = groupIdx != null
                      ? visiveis.filter(x => transfGroups.get(x.idx) === groupIdx)
                      : []
                    const isFirstInGroup = isInTransf && groupMembers[0]?.idx === l.idx
                    const isLastInGroup  = isInTransf && groupMembers[groupMembers.length - 1]?.idx === l.idx
                    const transfColor    = '#7c3aed'
                    const mov = l.saldoRow.movimento
                    const movLeftBorder = !isInTransf && !hasErro
                      ? mov === 'ENTRADA'   ? '3px solid #059669'
                      : mov === 'DEVOLUCAO' ? '3px solid #2563eb'
                      : undefined
                      : undefined
                    // Herda estoque/fornecedor/unidade da cabeça se o item não tiver
                    const headLine = isTransfItem
                      ? visiveis.find(x => x.idx === groupIdx)
                      : undefined

                    const codEstoque = l.saldoRow.estoque ?? (isTransfItem ? headLine?.saldoRow.estoque : undefined)
                    const dsEstoque  = info?.DS_ESTOQUE
                      ?? info?.SALDO_ESTOQUE?.find(e => String(e.CD_ESTOQUE) === codEstoque)?.DS_ESTOQUE
                      ?? info?.SALDO_ESTOQUE?.[0]?.DS_ESTOQUE
                    const labelEst  = codEstoque
                      ? `${codEstoque}${dsEstoque ? ' – ' + dsEstoque : ''}`
                      : (dsEstoque ?? '—')
                    const codForn   = l.saldoRow.fornecedor ?? (isTransfItem ? headLine?.saldoRow.fornecedor : undefined)
                    const nmForn    = info?.NM_FORNECEDOR
                      ?? info?.SALDO_CONSIG_FORN?.find(f => String(f.CD_FORNECEDOR) === codForn)?.NM_FORNECEDOR
                      ?? info?.SALDO_CONSIG_FORN?.[0]?.NM_FORNECEDOR
                    const labelForn = codForn
                      ? `${codForn}${nmForn ? ' – ' + nmForn : ''}`
                      : (nmForn ?? '—')
                    const codUnidade = l.saldoRow.unidade ?? (isTransfItem ? headLine?.saldoRow.unidade : undefined)
                    const labelUnidade = info?.DS_UNIDADE
                      ? `${info.DS_UNIDADE}${info.UNIDADE?.VL_FATOR && info.UNIDADE.VL_FATOR !== 1 ? ` (×${info.UNIDADE.VL_FATOR})` : ''}`
                      : (codUnidade || '—')
                    const semSaldo = !loadingSaldo && info && !info.ERRO
                      && info.TOTAL_ESTOQUE === 0
                      && info.TOTAL_FICHA_ESTOQUE === 0
                      && info.TOTAL_LOTES === 0

                    return (
                      <tr
                        key={l.idx}
                        style={{
                          background:    hasErro
                            ? 'var(--danger-muted)'
                            : isTransfHead
                              ? 'rgba(124,58,237,0.08)'
                              : isTransfItem
                                ? 'rgba(124,58,237,0.03)'
                                : mov === 'ENTRADA'
                                  ? 'rgba(5,150,105,0.03)'
                                  : mov === 'DEVOLUCAO'
                                    ? 'rgba(37,99,235,0.03)'
                                    : semSaldo
                                      ? 'rgba(251,146,60,0.12)'
                                      : undefined,
                          verticalAlign: 'top',
                          borderLeft:    isInTransf ? `3px solid ${transfColor}` : movLeftBorder,
                          borderRight:   isInTransf ? `3px solid ${transfColor}` : movLeftBorder,
                          borderTop:     isFirstInGroup ? `2px solid ${transfColor}` : undefined,
                          borderBottom:  isLastInGroup  ? `2px solid ${transfColor}` : movLeftBorder,
                        }}
                      >
                        {/* Checkbox — muda de cor após execução; abre modal se executado */}
                        <td style={{ paddingTop: 10, textAlign: 'center' }}>
                          {!hasErro && (() => {
                            const st  = lineStatus.get(l.idx)
                            const res = lineResults.get(l.idx)
                            if (st === 'running') return <Loader2 size={13} className="animate-spin" style={{ color: 'var(--brand)' }} />
                            if (st && st !== 'idle') {
                              const color = st === 'ok' ? '#2563eb'
                                          : st === 'parcial' ? '#f59e0b'
                                          : st === 'ignorado' ? '#6b7280'
                                          : '#dc2626'
                              return (
                                <button
                                  onClick={() => res && setModalItem({ l, result: res })}
                                  title="Clique para ver detalhes"
                                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 3, outline: `2px solid ${color}`, backgroundColor: color }}
                                >
                                  {(st === 'ok' || st === 'parcial')
                                    ? <CheckCircle2 size={11} style={{ color: '#fff' }} />
                                    : st === 'ignorado'
                                      ? <Clock size={11} style={{ color: '#fff' }} />
                                      : <XCircle size={11} style={{ color: '#fff' }} />
                                  }
                                </button>
                              )
                            }
                            return (
                              <input
                                type="checkbox"
                                checked={selected.has(l.idx)}
                                onChange={() => toggleOne(l.idx)}
                              />
                            )
                          })()}
                        </td>

                        {/* # */}
                        <td style={{ paddingTop: 10 }}>
                          <span className="badge badge-muted" style={{ fontSize: 10 }}>{l.idx + 1}</span>
                        </td>

                        {/* Produto */}
                        <td style={{ paddingTop: 8 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                            {l.saldoRow.produto
                              ? <>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{l.saldoRow.produto} – </span>
                                  {loadingSaldo
                                    ? <span style={{ color: 'var(--text-muted)' }}>…</span>
                                    : info?.ERRO
                                      ? <span style={{ color: 'var(--danger)' }}>{info.DS_PRODUTO}</span>
                                      : (info?.DS_PRODUTO ?? l.saldoRow.produto)
                                  }
                                </>
                              : isLoteDetalheRow
                                ? <div style={{ lineHeight: 1.5 }}>
                                    {l.saldoRow.lote && (
                                      <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>
                                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Lote: </span>{l.saldoRow.lote}
                                      </div>
                                    )}
                                    {l.saldoRow.validade && (
                                      <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>
                                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Validade: </span>{l.saldoRow.validade}
                                      </div>
                                    )}
                                  </div>
                                : isTransfItem
                                  ? <span style={{ color: '#7c3aed', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>ITEM TRANSF.</span>
                                  : <span style={{ color: 'var(--text-muted)' }}>—</span>
                            }
                          </div>
                        </td>

                        {/* Estoque */}
                        <td style={{ paddingTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>
                          {isLoteDetalheRow
                            ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                            : effMov(l) === 'ENTRADA' && (!l.saldoRow.estoque || l.saldoRow.estoque.trim() === '')
                              ? <span title="Estoque obrigatório para ENTRADA" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>E</span>
                              : codEstoque || dsEstoque
                                ? <span title={labelEst} style={{ color: isTransfItem && !l.saldoRow.estoque ? '#7c3aed' : 'var(--text-secondary)', fontStyle: isTransfItem && !l.saldoRow.estoque ? 'italic' : undefined }}>{labelEst}</span>
                                : isTransfItem
                                  ? <span style={{ color: '#7c3aed', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>ITEM TRANSF.</span>
                                  : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>

                        {/* Fornecedor */}
                        <td style={{ paddingTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>
                          {effMov(l) === 'ENTRADA' && (!l.saldoRow.fornecedor || l.saldoRow.fornecedor.trim() === '')
                            ? <span title="Fornecedor obrigatório para ENTRADA" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>E</span>
                            : codForn || nmForn
                              ? <span title={labelForn} style={{ color: isTransfItem && !l.saldoRow.fornecedor ? '#7c3aed' : 'var(--text-secondary)', fontStyle: isTransfItem && !l.saldoRow.fornecedor ? 'italic' : undefined }}>{labelForn}</span>
                              : isLoteDetalheRow
                                ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                                : isTransfItem
                                  ? <span style={{ color: '#7c3aed', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>ITEM TRANSF.</span>
                                  : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>

                        {/* Unidade */}
                        <td style={{ paddingTop: 8, color: 'var(--text-secondary)' }}>
                          {isLoteDetalheRow
                            ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                            : effMov(l) === 'ENTRADA' && (!l.saldoRow.unidade || l.saldoRow.unidade.trim() === '') && !info?.CD_UNIDADE
                              ? <span title="Unidade obrigatória para ENTRADA" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>E</span>
                              : <span title={labelUnidade} style={{ color: isTransfItem && !l.saldoRow.unidade ? '#7c3aed' : undefined, fontStyle: isTransfItem && !l.saldoRow.unidade ? 'italic' : undefined }}>{labelUnidade}</span>}
                        </td>

                        {/* Quantidade */}
                        <td style={{ paddingTop: 8, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--brand)' }}>
                          {l.saldoRow.saldo}
                        </td>

                        {/* Movimento */}
                        <td style={{ paddingTop: 6, textAlign: 'center' }}>
                          {isLoteDetalheRow
                            ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', letterSpacing: '0.04em', background: 'rgba(22,163,74,0.1)', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>LOTE TRANSF.</span>
                            : isTransfItem
                            ? <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.04em', background: 'rgba(124,58,237,0.1)', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>ITEM TRANSF.</span>
                            : hasErro
                              ? <span style={{ color: 'var(--danger)', fontSize: 10, fontWeight: 500 }}>obrigatório</span>
                              : <MovimentoSelect
                                  value={effMov(l)}
                                  onChange={val => setMovOverrides(prev => { const n = new Map(prev); n.set(l.idx, val); return n })}
                                />
                          }
                        </td>

                        {/* Est. */}
                        <td style={{ paddingTop: 8, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {loadingSaldo
                            ? <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>…</span>
                            : info?.ERRO
                              ? <span style={{ color: 'var(--danger)', fontSize: 10 }}>!</span>
                              : info
                                ? <span style={{ fontWeight: 700, color: info.TOTAL_ESTOQUE > 0 ? 'var(--brand)' : 'var(--text-muted)' }} title={`Estoque físico: ${info.TOTAL_ESTOQUE}`}>{info.TOTAL_ESTOQUE}</span>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>
                          }
                        </td>

                        {/* Ficha */}
                        <td style={{ paddingTop: 8, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {loadingSaldo
                            ? <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>…</span>
                            : info && !info.ERRO
                              ? <span style={{ fontWeight: 700, color: info.TOTAL_FICHA_ESTOQUE > 0 ? 'var(--info, var(--brand))' : 'var(--text-muted)' }} title={`Saldo ficha: ${info.TOTAL_FICHA_ESTOQUE}`}>{info.TOTAL_FICHA_ESTOQUE}</span>
                              : <span style={{ color: 'var(--text-muted)' }}>—</span>
                          }
                        </td>

                        {/* Lote */}
                        <td style={{ paddingTop: 8, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {loadingSaldo
                            ? <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>…</span>
                            : info && !info.ERRO
                              ? <span style={{ fontWeight: 700, color: info.TOTAL_LOTES > 0 ? 'var(--success)' : 'var(--text-muted)' }} title={`Saldo lotes: ${info.TOTAL_LOTES}`}>{info.TOTAL_LOTES}</span>
                              : <span style={{ color: 'var(--text-muted)' }}>—</span>
                          }
                        </td>

                        {/* Status */}
                        <td style={{ paddingTop: 10, textAlign: 'center', padding: '10px 4px' }}>
                          {hasErro
                            ? <span title={l.erros.join(' · ')}><XCircle size={14} style={{ color: 'var(--danger)' }} /></span>
                            : semSaldo && effMov(l) === 'DEVOLUCAO'
                              ? <span title="Não é possível devolver com saldo zerado em estoque" style={{ cursor: 'help' }}>
                                  <AlertCircle size={14} style={{ color: '#f59e0b' }} />
                                </span>
                              : <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />}
                        </td>
                      </tr>
                    )
                  })}
                  {visiveis.length === 0 && (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        Nenhuma linha encontrada para &quot;{busca}&quot;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )
          })()}
        </div>
      </div>

      {/* Barra de progresso durante importação */}
      {importProgress && (
        <div style={{ margin: '4px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
            <span>Executando…</span>
            <span>{importProgress.done} / {importProgress.total}</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--brand)', borderRadius: 2, transition: 'width 0.3s', width: `${(importProgress.done / importProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Modal de detalhes da execução */}
      {modalItem && (() => {
        const { l, result } = modalItem
        const st = lineStatus.get(l.idx)!
        const info = getSaldo(l)
        const isEntrada = effMov(l) === 'ENTRADA'
        const isTransf  = effMov(l) === 'TRANSFERENCIA' || (result.ok && !!result.oracleRaw)
        const headerColor = st === 'ok' ? (isTransf ? '#7c3aed' : isEntrada ? '#059669' : '#2563eb') : st === 'parcial' ? '#d97706' : st === 'ignorado' ? '#6b7280' : '#dc2626'
        const headerLabel = st === 'ok' ? (isTransf ? 'Transferência concluída' : isEntrada ? 'Entrada registrada' : 'Devolução concluída') : st === 'parcial' ? 'Devolução parcial' : st === 'ignorado' ? 'Ignorado' : (isTransf ? 'Erro na transferência' : isEntrada ? 'Erro na entrada' : 'Erro na devolução')
        return (
          <div
            onClick={() => setModalItem(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#ffffff', borderRadius: 10, width: '100%', maxWidth: 660, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: headerColor, flexShrink: 0 }}>
                {st === 'ok'
                  ? <CheckCircle2 size={17} style={{ color: '#fff', flexShrink: 0 }} />
                  : st === 'parcial'
                    ? <AlertCircle size={17} style={{ color: '#fff', flexShrink: 0 }} />
                    : st === 'ignorado'
                      ? <Clock size={17} style={{ color: '#fff', flexShrink: 0 }} />
                      : <XCircle size={17} style={{ color: '#fff', flexShrink: 0 }} />
                }
                <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', flex: 1 }}>{headerLabel}</span>
                <button onClick={() => setModalItem(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'flex', padding: 4, lineHeight: 0 }}><X size={16} /></button>
              </div>

              {/* Body */}
              <div style={{ overflow: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, background: '#ffffff', color: '#111827' }}>

                {/* Produto / Estoque / Fornecedor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 12, background: '#f9fafb', borderRadius: 8, padding: '12px 14px', border: '1px solid #e5e7eb' }}>
                  {[
                    ['Produto', `${l.saldoRow.produto} – ${info?.DS_PRODUTO ?? ''}`],
                    ['Estoque', l.saldoRow.estoque ?? '—'],
                    ['Fornecedor', l.saldoRow.fornecedor ?? '—'],
                    [isEntrada ? 'Qt. entrada' : 'Qt. solicitada', l.saldoRow.saldo],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{k}</div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Mensagem de erro */}
                {!result.ok && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b' }}>
                    <XCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ lineHeight: 1.5 }}>{result.erro}</span>
                  </div>
                )}
                {result.ok && result.mensagem && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ lineHeight: 1.5 }}>{result.mensagem}</span>
                  </div>
                )}

                {/* Resumo devolução */}
                {result.ok && result.status !== 'ignorado' && (
                  <div style={{ display: 'flex', gap: 0, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
                    {([
                      [isTransf ? 'Qt. devolvida' : isEntrada ? 'Qt. entrada' : 'Qt. devolvida', result.qtTotalDevolvida != null ? String(result.qtTotalDevolvida) : '—'],
                      (!isTransf && result.qtNaoAtendida) ? ['Qt. não atendida', String(result.qtNaoAtendida)] : null,
                      [isTransf ? '1ª ENT_PRO' : 'Sessão Postgres', result.cdSessao != null ? String(result.cdSessao) : '—'],
                      [isTransf ? '1º DEV_FOR'  : 'Item Postgres',  result.cdItem  != null ? String(result.cdItem)  : '—'],
                    ] as ([string, string] | null)[]).filter(Boolean).map(([k, v], i, arr) => (
                      <div key={k} style={{ flex: 1, padding: '10px 14px', borderRight: i < arr.length - 1 ? '1px solid #bbf7d0' : 'none' }}>
                        <div style={{ color: '#166534', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{k}</div>
                        <div style={{ fontWeight: 700, color: '#14532d', fontSize: 15 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Registros Oracle - DEVOLUCAO */}
                {result.ok && result.devolucoes && result.devolucoes.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Registros Oracle</div>
                    {result.devolucoes.map((dev, di) => (
                      <div key={di} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ background: '#f3f4f6', padding: '8px 12px', fontSize: 11, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {[['DEV_FOR', dev.cd_devolucao], ['ENT_PRO', dev.cd_ent_pro], ['Fornecedor', dev.cd_fornecedor], ['Qt.', dev.qt_devolvida], ['Vl. total', dev.vl_total]]
                            .map(([k, v]) => (
                              <span key={String(k)} style={{ color: '#374151' }}>
                                <span style={{ color: '#9ca3af' }}>{k}: </span>
                                <strong>{String(v)}</strong>
                              </span>
                            ))}
                        </div>
                        {dev.itens?.length > 0 && (
                          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f9fafb' }}>
                                {['ITDEV_FOR', 'Lote', 'Validade', 'Qt'].map(h => (
                                  <th key={h} style={{ padding: '5px 10px', textAlign: h === 'Qt' ? 'right' : 'left', fontWeight: 600, color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {dev.itens.map((it, ii) => (
                                <tr key={ii} style={{ borderTop: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '5px 10px', color: '#374151' }}>{it.cd_itdev_for}</td>
                                  <td style={{ padding: '5px 10px', color: '#374151' }}>{it.cd_lote ?? '—'}</td>
                                  <td style={{ padding: '5px 10px', color: '#374151' }}>{it.dt_validade ?? '—'}</td>
                                  <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{it.qt}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Registros Oracle - ENTRADA */}
                {result.ok && result.entrada && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Registros Oracle</div>
                    <div style={{ border: '1px solid #bbf7d0', borderRadius: 8, overflow: 'hidden', background: '#f0fdf4', padding: '10px 14px', fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {(
                        [
                          ['ENT_PRO',     result.entrada.cd_ent_pro],
                          ['ITENT_PRO',   result.entrada.cd_itent_pro],
                          result.entrada.cd_itlot_ent != null ? ['ITLOT_ENT', result.entrada.cd_itlot_ent] : null,
                          ['Uni.Pro',     result.entrada.cd_uni_pro],
                          ['Custo Médio', result.entrada.cd_custo_medio],
                          ['Qt.',         result.entrada.qt_entrada],
                          ['SN_LOTE',     result.entrada.sn_lote],
                        ] as ([string, unknown] | null)[]
                      ).filter(Boolean).map(([k, v]) => (
                        <span key={String(k)} style={{ color: '#374151' }}>
                          <span style={{ color: '#6b7280' }}>{k}: </span>
                          <strong>{String(v)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Registros Oracle - TRANSFERÊNCIA */}
                {result.ok && result.oracleRaw && (() => {
                  const f1 = Array.isArray(result.oracleRaw.fase1_devolucoes) ? result.oracleRaw.fase1_devolucoes as Record<string, unknown>[] : []
                  const f2 = Array.isArray(result.oracleRaw.fase2_entradas)   ? result.oracleRaw.fase2_entradas   as Record<string, unknown>[] : []
                  const sv = Array.isArray(result.oracleRaw.sus_vinculos)      ? result.oracleRaw.sus_vinculos      as Record<string, unknown>[] : []
                  const totalDev = f1.reduce((s, d) => s + Number(d.qt_devolvida ?? 0), 0)
                  const totalEnt = f2.reduce((s, e) => s + Number(e.qt_entrada   ?? 0), 0)
                  return (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Registros Oracle — Transferência</div>

                      {/* totais */}
                      {(f1.length > 0 || f2.length > 0) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '8px 12px' }}>
                            <div style={{ color: '#7c3aed', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Total devolvido</div>
                            <div style={{ fontWeight: 700, color: '#4c1d95', fontSize: 16 }}>{totalDev}</div>
                            <div style={{ color: '#a78bfa', fontSize: 10 }}>{f1.length} devolu&ccedil;&atilde;o(&otilde;es)</div>
                          </div>
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px' }}>
                            <div style={{ color: '#059669', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Total entrada</div>
                            <div style={{ fontWeight: 700, color: '#065f46', fontSize: 16 }}>{totalEnt}</div>
                            <div style={{ color: '#6ee7b7', fontSize: 10 }}>{f2.length} produto(s)</div>
                          </div>
                        </div>
                      )}

                      {/* vínculos SUS */}
                      {sv.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                          {sv.map((v, vi) => (
                            <div key={vi} style={{ border: '1px solid #bae6fd', borderRadius: 8, background: '#f0f9ff', padding: '7px 12px', fontSize: 11, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ color: '#374151' }}>
                                <span style={{ color: '#9ca3af' }}>Produto: </span>
                                <strong>{String(v.cd_produto ?? '—')}</strong>
                              </span>
                              <span style={{ color: '#cbd5e1' }}>→</span>
                              <span style={{ color: '#374151' }}>
                                <span style={{ color: '#9ca3af' }}>Filho: </span>
                                <strong>{String(v.cd_produto_filho ?? '—')}</strong>
                              </span>
                              <span style={{ marginLeft: 'auto', background: '#0369a1', color: '#fff', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                {String(v.cd_procedimento_sus ?? '—')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* fase1_devolucoes */}
                      {f1.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>Fase 1 — Devoluções</div>
                          {f1.map((dev, di) => (
                            <div key={di} style={{ border: '1px solid #ede9fe', borderRadius: 6, marginBottom: 6, background: '#f5f3ff', padding: '8px 12px', fontSize: 11, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                              {([['DEV_FOR', dev.cd_devolucao], ['Produto', dev.cd_produto], ['ENT_PRO', dev.cd_ent_pro], ['Fornecedor', dev.cd_fornecedor], ['Qt.', dev.qt_devolvida]] as [string, unknown][])
                                .map(([k, v]) => (
                                  <span key={String(k)} style={{ color: '#374151' }}>
                                    <span style={{ color: '#7c3aed' }}>{k}: </span>
                                    <strong>{String(v)}</strong>
                                  </span>
                                ))}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* fase2_entradas */}
                      {f2.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#059669', marginBottom: 4 }}>Fase 2 — Entradas</div>
                          {f2.map((ent, ei) => (
                            <div key={ei} style={{ border: '1px solid #bbf7d0', borderRadius: 6, marginBottom: 6, background: '#f0fdf4', padding: '8px 12px', fontSize: 11, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                              {([['ENT_PRO', ent.cd_ent_pro], ['Produto', ent.cd_produto], ['ITENT_PRO', ent.cd_itent_pro], ['Qt.', ent.qt_entrada], ['Vl.unit', ent.vl_unitario]] as [string, unknown][])
                                .map(([k, v]) => (
                                  <span key={String(k)} style={{ color: '#374151' }}>
                                    <span style={{ color: '#6b7280' }}>{k}: </span>
                                    <strong>{String(v)}</strong>
                                  </span>
                                ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* JSON bruto colapsável */}
                <details style={{ fontSize: 11 }}>
                  <summary style={{ cursor: 'pointer', color: '#6b7280', userSelect: 'none', fontWeight: 500 }}>JSON completo</summary>
                  <pre style={{ marginTop: 6, padding: 10, background: '#f3f4f6', borderRadius: 6, overflowX: 'auto', fontSize: 10, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#374151' }}>{JSON.stringify(result, null, 2)}</pre>
                </details>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Rodapé */}
      <div className="flex items-center justify-between">
        <button className="btn btn-secondary flex items-center gap-1.5" onClick={onBack} disabled={importing}>
          <ChevronLeft size={15} /> Voltar
        </button>
        <div className="flex items-center gap-2">
          {importado && (
            <button className="btn btn-secondary flex items-center gap-1.5" onClick={onNovaImportacao}>
              <RotateCcw size={13} /> Nova Importação
            </button>
          )}
          <button
            className="btn btn-gradient flex items-center gap-1.5"
            disabled={linhasParaImportar.length === 0 || importing || importado}
            onClick={handleImportar}
            title={importado ? 'Importação já realizada. Clique em "Nova Importação" para iniciar uma nova.' : undefined}
          >
            {importing
              ? <><Loader2 size={15} className="animate-spin" /> Importando…</>
              : importado
                ? <><CheckCircle2 size={15} /> Importação Concluída</>
                : <><TrendingUp size={15} /> Importar {linhasParaImportar.length} Saldo(s)</>}
          </button>
        </div>
      </div>
    </div>
  )
}
