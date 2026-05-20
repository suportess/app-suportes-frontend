'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileSpreadsheet, Lock, Link2 } from 'lucide-react'

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
  {
    href:  '/dashboard/cadastros/produtos/importacao/vinculo',
    label: 'Vínculo',
    icon:  Link2,
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
