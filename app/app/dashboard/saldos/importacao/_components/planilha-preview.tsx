'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Table2 } from 'lucide-react'
import type { Row } from '../_lib/saldos-utils'

const COL_LABELS: Record<string, string> = {
  Produto: 'Produto', Estoque: 'Estoque', Fornecedor: 'Fornecedor',
  Unidade: 'Unid.', Saldo: 'Saldo', Movimento: 'Movimento',
}

export function PlanilhaPreview({ headers, rows }: { headers: string[]; rows: Row[] }) {
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Oculta colunas geradas automaticamente para headers vazios (ex: __EMPTY, __EMPTY_1)
  const visibleHeaders = headers.filter(h => !h.startsWith('__'))

  const columns: ColumnDef<Row>[] = visibleHeaders.map(h => ({
    id: h, accessorKey: h,
    header: COL_LABELS[h] ?? h,
    size: h === 'Produto' ? 280 : h === 'Estoque' || h === 'Fornecedor' ? 200 : 110,
  }))

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })
  const { rows: tableRows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 36,
    overscan: 20,
  })

  const virtualItems  = rowVirtualizer.getVirtualItems()
  const totalSize     = rowVirtualizer.getTotalSize()
  const paddingTop    = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0
  const paddingBottom = virtualItems.length > 0
    ? totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0) : 0

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Table2 size={15} style={{ color: 'var(--success)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Pré-visualização</span>
          <span className="badge badge-muted">{rows.length.toLocaleString('pt-BR')} linhas</span>
          <span className="badge badge-muted">{visibleHeaders.length} colunas</span>
        </div>
      </div>

      <div ref={tableContainerRef} className="overflow-auto" style={{ maxHeight: 340 }}>
        <table
          className="data-table"
          style={{
            tableLayout: 'fixed',
            width: '100%',
            minWidth: columns.reduce((s, c) => s + (c.size ?? 110), 0),
          }}
        >
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} style={{ width: h.getSize(), minWidth: h.getSize() }}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && <tr><td colSpan={visibleHeaders.length} style={{ height: paddingTop }} /></tr>}
            {virtualItems.map(vi => {
              const row = tableRows[vi.index]
              return (
                <tr key={row.id} style={{ height: 36 }}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
            {paddingBottom > 0 && <tr><td colSpan={visibleHeaders.length} style={{ height: paddingBottom }} /></tr>}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        Mostrando {virtualItems.length} de {rows.length.toLocaleString('pt-BR')} linhas visíveis
      </div>
    </div>
  )
}
