'use client'

import { useState } from 'react'
import { Pill, Search, Plus, Edit2, CheckCircle2, XCircle } from 'lucide-react'

// ─── Dados mock ───────────────────────────────────────────────────────────────

type Produto = {
  id: number
  nome: string
  unidade: string
  snConsignado: boolean
  snLote: boolean
  snValidade: boolean
  qtdEstoque: number
}

const produtos: Produto[] = [
  { id: 1,  nome: 'Dipirona 500mg',            unidade: 'CP',  snConsignado: false, snLote: false, snValidade: false, qtdEstoque: 3200 },
  { id: 2,  nome: 'Amoxicilina 500mg',         unidade: 'CP',  snConsignado: false, snLote: true,  snValidade: true,  qtdEstoque: 850  },
  { id: 3,  nome: 'Soro Fisiológico 0,9% 500ml', unidade: 'FR', snConsignado: false, snLote: true,  snValidade: true,  qtdEstoque: 420  },
  { id: 4,  nome: 'Insulina NPH 100UI/mL',     unidade: 'FL',  snConsignado: true,  snLote: true,  snValidade: true,  qtdEstoque: 78   },
  { id: 5,  nome: 'Omeprazol 20mg',            unidade: 'CP',  snConsignado: false, snLote: false, snValidade: true,  qtdEstoque: 1450 },
  { id: 6,  nome: 'Paracetamol 750mg',         unidade: 'CP',  snConsignado: false, snLote: false, snValidade: false, qtdEstoque: 2100 },
  { id: 7,  nome: 'Metformina 850mg',          unidade: 'CP',  snConsignado: false, snLote: false, snValidade: true,  qtdEstoque: 630  },
  { id: 8,  nome: 'Losartana 50mg',            unidade: 'CP',  snConsignado: false, snLote: false, snValidade: true,  qtdEstoque: 990  },
  { id: 9,  nome: 'Enoxaparina 40mg',          unidade: 'SER', snConsignado: true,  snLote: true,  snValidade: true,  qtdEstoque: 36   },
  { id: 10, nome: 'Atorvastatina 20mg',        unidade: 'CP',  snConsignado: false, snLote: false, snValidade: true,  qtdEstoque: 760  },
]

function Sim() {
  return <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--success)' }}><CheckCircle2 size={12} /> Sim</span>
}
function Nao() {
  return <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}><XCircle size={12} /> Não</span>
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function ProdutosPage() {
  const [busca, setBusca] = useState('')
  const [filtroLote, setFiltroLote] = useState('Todos')
  const [filtroConsig, setFiltroConsig] = useState('Todos')

  const filtrados = produtos.filter(p => {
    const matchBusca = busca === '' || p.nome.toLowerCase().includes(busca.toLowerCase())
    const matchLote = filtroLote === 'Todos' || (filtroLote === 'Sim' ? p.snLote : !p.snLote)
    const matchConsig = filtroConsig === 'Todos' || (filtroConsig === 'Sim' ? p.snConsignado : !p.snConsignado)
    return matchBusca && matchLote && matchConsig
  })

  const baixo = filtrados.filter(p => p.qtdEstoque < 100).length

  return (
    <div className="page animate-fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--purple-muted)' }}>
              <Pill size={17} style={{ color: 'var(--purple)' }} />
            </div>
            Produtos
          </h1>
          <p className="page-subtitle">Cadastro de medicamentos e materiais hospitalares</p>
        </div>
        <button className="btn btn-gradient">
          <Plus size={15} /> Novo Produto
        </button>
      </div>

      {/* Alerta saldo baixo */}
      {baixo > 0 && (
        <div className="alert alert-warning">
          <XCircle size={15} />
          <span>{baixo} produto{baixo > 1 ? 's' : ''} com saldo abaixo de 100 unidades.</span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-52 input-field">
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            className="bg-transparent outline-none text-sm flex-1"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Buscar produto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select className="select-field" value={filtroLote} onChange={e => setFiltroLote(e.target.value)}>
          <option value="Todos">Controla Lote</option>
          <option>Sim</option>
          <option>Não</option>
        </select>
        <select className="select-field" value={filtroConsig} onChange={e => setFiltroConsig(e.target.value)}>
          <option value="Todos">Consignado</option>
          <option>Sim</option>
          <option>Não</option>
        </select>
      </div>

      {/* Tabela */}
      {filtrados.length > 0 ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th>Unidade</th>
                <th>Consignado</th>
                <th>Ctrl. Lote</th>
                <th>Ctrl. Validade</th>
                <th>Saldo Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.id}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.nome}</td>
                  <td><span className="badge badge-muted">{p.unidade}</span></td>
                  <td>{p.snConsignado ? <Sim /> : <Nao />}</td>
                  <td>{p.snLote ? <Sim /> : <Nao />}</td>
                  <td>{p.snValidade ? <Sim /> : <Nao />}</td>
                  <td>
                    <span style={{ color: p.qtdEstoque < 100 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 600 }}>
                      {p.qtdEstoque.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td>
                    <button className="icon-btn" title="Editar">
                      <Edit2 size={14} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">
            {filtrados.length} de {produtos.length} produtos
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-p flex flex-col items-center py-12 gap-3">
            <Pill size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">Nenhum produto encontrado.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => { setBusca(''); setFiltroLote('Todos'); setFiltroConsig('Todos') }}>
              Limpar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
