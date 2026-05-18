'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileSpreadsheet, Lock } from 'lucide-react'

const TABS = [
  {
    href:  '/dashboard/cadastros/produtos/importacao',
    label: 'Cadastro',
    icon:  FileSpreadsheet,
  },
  {
    href:  '/dashboard/cadastros/produtos/importacao/bloqueio',
    label: 'Bloqueio',
    icon:  Lock,
  },
]

export function ImportacaoTabs() {
  const pathname = usePathname()

  return (
    <div className="tab-group">
      {TABS.map(tab => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab-item${active ? ' active' : ''}`}
          >
            <tab.icon size={14} />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
