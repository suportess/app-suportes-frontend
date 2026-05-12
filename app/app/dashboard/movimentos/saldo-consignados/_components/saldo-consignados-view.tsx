'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Package, AlertTriangle, Loader2, RefreshCw, Plus, ChevronRight, Trash2, Eye, ArrowRight } from 'lucide-react'
import type { EmpresaDTO, MultiEmpresaPortalDTO, EstoquePortalDTO, SaldoProdutoConsignadoPortalDTO, ProdutoDetalhePortalDTO, SaldoConsigFornPortalDTO, OperacaoBaixaConsignadoDTO, FornecedorPortalDTO, ProdutoConsignadoPortalDTO } from '@/lib/types'
import {
  listarMultiEmpresas,
  listarEstoquesTodosConsignados,
  listarSaldoConsignados,
  buscarProdutoDetalhe,
  listarSaldoConsigForn,
} from '../../actions'
import { fmtQtd, CampoLabel, Combobox, type Item } from './sc-shared'
import { BaixaConsignadosView } from './sc-baixa-view'
import { ProdutoDetalheModal } from './sc-modal-detalhe'

export function SaldoConsignadosView({ empresaConf, initialOperacao, onConcluir }: { empresaConf: EmpresaDTO; initialOperacao?: OperacaoBaixaConsignadoDTO; onConcluir?: () => void }) {
  const empresaId = empresaConf.id

  // Reconstruir adicionados a partir de initialOperacao
  const initialAdicionados = useMemo(() => {
    if (!initialOperacao) return undefined
    return initialOperacao.itens.map(item => ({
      produto: { CD_PRODUTO: String(item.cdProduto), DS_PRODUTO: item.dsProduto ?? '' } as ProdutoConsignadoPortalDTO,
      snLote: (item.snLote ?? 'N') as 'S' | 'N',
      snValidade: (item.snValidade ?? 'N') as 'S' | 'N',
      linhas: item.linhas.map(l => ({
        fornecedor: { CD_FORNECEDOR: l.cdFornecedor, NM_FORNECEDOR: l.nmFornecedor ?? '' } as FornecedorPortalDTO,
        quantidade: String(l.quantidade ?? 0),
        lote: l.lote ?? '',
        validade: l.validade ?? '',
      })),
    }))
  }, [initialOperacao])

  // -?-? Seleção empresa e estoque -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?
  const [empresa, setEmpresa]   = useState<Item | null>(
    initialOperacao ? { id: initialOperacao.cdMultiEmpresa, label: String(initialOperacao.cdMultiEmpresa) } : null
  )
  const [estoque, setEstoque]   = useState<Item | null>(
    initialOperacao ? { id: initialOperacao.cdEstoque, label: initialOperacao.dsEstoque ?? String(initialOperacao.cdEstoque) } : null
  )
  const [produto, setProduto]   = useState<Item | null>(null)

  // -?-? Opções dos autocompletes -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?
  const [empresaOpts,    setEmpresaOpts]    = useState<Item[]>([])
  const [estoqueOpts,    setEstoqueOpts]    = useState<Item[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [loadingEstoques, setLoadingEstoques] = useState(false)

  // -?-? Todos os produtos do estoque (fonte para o autocomplete) -?-?-?-?-?-?-?-?-?-?-?-?-?-?
  const [todos,    setTodos]    = useState<SaldoProdutoConsignadoPortalDTO[]>([])
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState<string | null>(null)

  // -?-? Produtos incluídos na tabela -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?
  const [selecionados, setSelecionados] = useState<SaldoProdutoConsignadoPortalDTO[]>(
    initialOperacao
      ? initialOperacao.origens.map(o => ({
          CD_PRODUTO: String(o.cdProduto),
          DS_PRODUTO: o.dsProduto ?? '',
          QT_ESTOQUE_ATUAL: o.qtEstoqueAtual ?? 0,
          DS_UNI_PRO: null,
        } as SaldoProdutoConsignadoPortalDTO))
      : []
  )

  // -?-? Passo do fluxo (1 = seleção, 2 = baixa) -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?
  const [passo, setPasso] = useState<1 | 2>(initialOperacao ? 2 : 1)

  // -?-? Modal de detalhe -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?
  const [modalProduto,      setModalProduto]      = useState<SaldoProdutoConsignadoPortalDTO | null>(null)
  const [modalDetalhe,      setModalDetalhe]      = useState<ProdutoDetalhePortalDTO | null>(null)
  const [loadingModalDetalhe, setLoadingModalDetalhe] = useState(false)
  const [modalSaldoConsigForn,      setModalSaldoConsigForn]      = useState<SaldoConsigFornPortalDTO[]>([])
  const [loadingModalSaldoConsigForn, setLoadingModalSaldoConsigForn] = useState(false)
  // Persistência de ações por produto (CD_PRODUTO -?' CD_FORNECEDOR -?' acao)
  const [acoesMap, setAcoesMap] = useState<Record<number, Record<number, string>>>({})
  // -?-? Carregamento -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?

  const carregar = useCallback(async () => {
    if (!empresa || !estoque) return
    setLoading(true)
    setErro(null)
    try {
      const dados = await listarSaldoConsignados(
        empresaId,
        Number(empresa.id),
        Number(estoque.id),
      )
      setTodos(dados)
      // Atualiza qtds dos produtos já incluídos na tabela
      setSelecionados(prev =>
        prev.map(s => dados.find(d => d.CD_PRODUTO === s.CD_PRODUTO) ?? s)
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar produtos.')
    } finally {
      setLoading(false)
    }
  }, [empresa, estoque, empresaId])

  useEffect(() => {
    if (empresa && estoque) carregar()
    else { setTodos([]); setSelecionados([]); setProduto(null) }
  }, [empresa, estoque, carregar])

  // -?-? Carregar empresas na montagem -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?

  useEffect(() => {
    setLoadingEmpresas(true)
    listarMultiEmpresas(empresaId)
      .then((raw: MultiEmpresaPortalDTO[]) =>
        setEmpresaOpts(raw.map(e => ({ id: e.CD_MULTI_EMPRESA, label: e.DS_MULTI_EMPRESA })))
      )
      .finally(() => setLoadingEmpresas(false))
  }, [empresaId])

  // -?-? Carregar estoques quando empresa muda -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?

  useEffect(() => {
    if (!empresa) { setEstoqueOpts([]); return }
    setLoadingEstoques(true)
    listarEstoquesTodosConsignados(empresaId, Number(empresa.id))
      .then((raw: EstoquePortalDTO[]) =>
        setEstoqueOpts(raw.map(e => ({ id: e.CD_ESTOQUE, label: e.DS_ESTOQUE })))
      )
      .finally(() => setLoadingEstoques(false))
  }, [empresa, empresaId])

  // -?-? Opções do autocomplete de produto -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?

  const produtoOpts: Item[] = todos
    .filter(p => !selecionados.some(s => s.CD_PRODUTO === p.CD_PRODUTO))
    .map(p => ({ id: p.CD_PRODUTO, label: p.DS_PRODUTO }))

  // -?-? Abrir modal de detalhe -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?

  function abrirModal(encontrado: SaldoProdutoConsignadoPortalDTO) {
    setModalProduto(encontrado)
    setModalDetalhe(null)
    setLoadingModalDetalhe(true)
    buscarProdutoDetalhe(empresaId, Number(encontrado.CD_PRODUTO))
      .then(d => setModalDetalhe(d))
      .catch(() => setModalDetalhe(null))
      .finally(() => setLoadingModalDetalhe(false))
    setModalSaldoConsigForn([])
    setLoadingModalSaldoConsigForn(true)
    listarSaldoConsigForn(empresaId, Number(estoque!.id), Number(encontrado.CD_PRODUTO))
      .then(d => setModalSaldoConsigForn(d))
      .catch(() => setModalSaldoConsigForn([]))
      .finally(() => setLoadingModalSaldoConsigForn(false))
  }

  function handleIncluir() {
    if (!produto) return
    const encontrado = todos.find(p => String(p.CD_PRODUTO) === String(produto.id))
    if (!encontrado) return
    abrirModal(encontrado)
  }

  // -?-? Confirmar inclusão via modal -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?

  function handleConfirmarInclusao() {
    if (!modalProduto) return
    if (!selecionados.some(s => s.CD_PRODUTO === modalProduto.CD_PRODUTO)) {
      setSelecionados(prev => [...prev, modalProduto])
    }
    setModalProduto(null)
    setProduto(null)
  }

  // -?-? Remover produto da tabela -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?

  function handleRemover(cdProduto: string) {
    setSelecionados(prev => prev.filter(p => p.CD_PRODUTO !== cdProduto))
    setAcoesMap(prev => {
      const next = { ...prev }
      delete next[Number(cdProduto)]
      return next
    })
  }

  // -?-? Handlers empresa/estoque -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?

  function handleEmpresa(item: Item | null) {
    if (!item) { setEmpresa(null); setEstoque(null); setTodos([]); setSelecionados([]); setProduto(null); setPasso(1); return }
    setEmpresa(item)
    setEstoque(null)
    setTodos([])
    setSelecionados([])
    setProduto(null)
    setPasso(1)
  }

  // -?-? render -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?

  if (passo === 2 && estoque) {
    return (
      <BaixaConsignadosView
        estoque={estoque}
        selecionados={selecionados}
        empresaId={empresaId}
        cdMultiEmpresa={Number(empresa?.id ?? 0)}
        editandoId={initialOperacao?.id ?? null}
        initialAdicionados={initialAdicionados}
        onVoltar={() => setPasso(1)}
        onConcluir={() => { setPasso(1); setSelecionados([]); setProduto(null); onConcluir?.() }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* -?-? Seleção empresa + estoque + produto -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-? */}
      <div className="card">
        <div className="card-p">
          <div className="flex flex-col gap-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <CampoLabel label="Empresa" />
                <Combobox
                  value={empresa}
                  onChange={handleEmpresa}
                  placeholder="Selecione a empresa..."
                  items={empresaOpts}
                  loading={loadingEmpresas}
                />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <CampoLabel label="Estoque" />
                <Combobox
                  value={estoque}
                  onChange={item => { setEstoque(item); setSelecionados([]); setProduto(null) }}
                  placeholder={empresa ? 'Selecione o estoque...' : 'Selecione a empresa primeiro'}
                  disabled={!empresa}
                  items={estoqueOpts}
                  loading={loadingEstoques}
                />
              </div>
            </div>

            {empresa && estoque && (
              <div className="flex flex-col gap-1">
                <CampoLabel label="Produto" />
                <div className="flex flex-row items-stretch gap-2">
                  <div className="flex-1 min-w-0">
                    <Combobox
                      value={produto}
                      onChange={setProduto}
                      onConfirm={handleIncluir}
                      placeholder={loading ? 'Carregando produtos...' : 'Buscar produto para incluir...'}
                      disabled={loading || todos.length === 0}
                      items={produtoOpts}
                      loading={loading}
                    />
                  </div>
                  <button
                    className="btn btn-gradient flex items-center justify-center flex-shrink-0"
                    onClick={handleIncluir}
                    disabled={!produto}
                    title="Incluir produto"
                    style={{ width: '2.375rem', height: '2.375rem', padding: 0 }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* -?-? Erros -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-? */}
      {erro && (
        <div className="alert alert-danger">
          <AlertTriangle size={14} />
          <span>{erro}</span>
        </div>
      )}

      {/* -?-? Tabela de produtos incluídos -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-? */}
      {selecionados.length > 0 && (
        <div className="card">
          <div className="card-p flex flex-col gap-3">

            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="section-label flex-shrink-0 flex-1">
                <Package size={12} />
                <span>
                  {`${selecionados.length} produto${selecionados.length !== 1 ? 's' : ''}${estoque ? ` -? ${estoque.label}` : ''}`}
                </span>
              </div>
              <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Eye size={11} />
                Clique em um produto para ver detalhes
              </span>

              <div className="flex gap-2">
                <button
                  className="btn"
                  onClick={carregar}
                  disabled={!empresa || !estoque || loading}
                >
                  {loading
                    ? <Loader2 size={13} className="animate-spin" />
                    : <RefreshCw size={13} />
                  }
                  Atualizar
                </button>
                <button
                  className="btn btn-gradient flex items-center gap-1.5"
                  onClick={() => setPasso(2)}
                  disabled={selecionados.length === 0}
                >
                  Avançar
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--d2b-border)' }}>
                    <th
                      className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Produto
                    </th>
                    <th
                      className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide w-32"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Unidade
                    </th>
                    <th
                      className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-wide w-28"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Qtd
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {selecionados.map((p, idx) => (
                    <tr
                      key={p.CD_PRODUTO + '-' + idx}
                      onClick={() => abrirModal(p)}
                      title="Clique para ver detalhes e ações"
                      style={{
                        borderBottom: '1px solid var(--d2b-border)',
                        background: idx % 2 === 1 ? 'var(--d2b-hover)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-muted)')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 1 ? 'var(--d2b-hover)' : 'transparent')}
                    >
                      <td className="py-2.5 px-3" style={{ color: 'var(--text-primary)' }}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium flex items-center gap-1.5">
                            {p.DS_PRODUTO}
                            <Eye size={11} className="opacity-0 group-hover:opacity-100" style={{ color: 'var(--brand)', flexShrink: 0 }} />
                          </span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Cód. {p.CD_PRODUTO}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3" style={{ color: 'var(--text-secondary)' }}>
                        {p.DS_UNI_PRO ?? '-?'}
                      </td>
                      <td
                        className="py-2.5 px-3 text-right font-mono font-semibold"
                        style={{
                          color: Number(p.QT_ESTOQUE_ATUAL) > 0
                            ? 'var(--success)'
                            : 'var(--text-muted)',
                        }}
                      >
                        {fmtQtd(p.QT_ESTOQUE_ATUAL)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={e => { e.stopPropagation(); handleRemover(p.CD_PRODUTO) }}
                          title="Remover produto da lista"
                          className="opacity-40 hover:opacity-100 transition-opacity p-1"
                          style={{ color: 'var(--danger, #ef4444)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* -?-? Modal detalhe produto -?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-?-? */}
      {modalProduto && (
        <ProdutoDetalheModal
          saldo={modalProduto}
          detalhe={modalDetalhe}
          loadingDetalhe={loadingModalDetalhe}
          saldoConsigForn={modalSaldoConsigForn}
          loadingSaldoConsigForn={loadingModalSaldoConsigForn}
          savedAcoes={acoesMap[Number(modalProduto.CD_PRODUTO)] ?? {}}
          onAcoesChange={acoes =>
            setAcoesMap(prev => ({ ...prev, [Number(modalProduto.CD_PRODUTO)]: acoes }))
          }
          onConfirmar={handleConfirmarInclusao}
          onFechar={() => setModalProduto(null)}
        />
      )}

    </div>
  )
}
