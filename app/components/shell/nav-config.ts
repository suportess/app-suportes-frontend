/**
 * nav-config.ts — CONFIGURAÇÃO CENTRAL DE NAVEGAÇÃO
 * Portal — Gestão de Estoque Hospitalar
 *
 * ─── VISIBILIDADE DO MENU (specs) ────────────────────────────────────────────
 * Itens OCULTOS (comentados abaixo — descomentar para reativar):
 *
 * MOVIMENTAÇÃO
 *   - Saídas       (/dashboard/movimentos/saidas)        → ainda não implementado
 *   - Devoluções   (/dashboard/movimentos/devolucoes)    → ainda não implementado
 *   - Baixas       (/dashboard/movimentos/baixas)         → ainda não implementado
 *   - Entradas     (/dashboard/entradas)                  → ainda não implementado
 *
 * ESTOQUE
 *   - Grupo inteiro (Saldos) → ainda não implementado
 *
 * CADASTROS
 *   - Grupo inteiro → ainda não implementado
 *
 * RELATÓRIOS
 *   - Grupo inteiro → ainda não implementado
 *
 * CONFIGURAÇÕES
 *   - Estoques     (/dashboard/configuracoes/estoques)   → ainda não implementado
 *   - Usuários     (/dashboard/configuracoes/usuarios)   → ainda não implementado
 *   - Permissões   (/dashboard/configuracoes/permissoes) → ainda não implementado
 *
 * Itens ATIVOS:
 *   - Início
 *   - Movimentos › Transferências
 *   - Configurações › Empresa
 *   - Configurações › Banco de Dados
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  Home,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Archive,
  PackageOpen,
  ClipboardList,
  Pill,
  Ruler,
  Truck,
  UserRound,
  Building2,
  XCircle,
  BarChart3,
  Settings,
  Users,
  KeyRound,
  Landmark,
  Database,
  ServerCog,
  Package,
  FileSpreadsheet,
  TrendingUp,
  Table2,
  FileCode2,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  requiresAdmin?: boolean
  children?: NavItem[]
}

export type NavGroup = {
  title?: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  // ── INÍCIO (oculto) ─────────────────────────────────────────────────────────
  // {
  //   items: [
  //     { label: 'Início', href: '/dashboard', icon: Home },
  //   ],
  // },
  {
    title: 'Movimentação',
    items: [
      {
        label: 'Movimentos',
        href: '/dashboard/movimentos',
        icon: ArrowUpDown,
        children: [
          // { label: 'Saídas',         href: '/dashboard/movimentos/saidas',        icon: ArrowUpRight   }, // OCULTO
          // { label: 'Devoluções',     href: '/dashboard/movimentos/devolucoes',    icon: ArrowDownLeft  }, // OCULTO
          { label: 'Transferências',    href: '/dashboard/movimentos/transferencias',    icon: ArrowLeftRight },
          { label: 'Saldo Consignados', href: '/dashboard/movimentos/saldo-consignados', icon: Package        },
          // { label: 'Baixas',         href: '/dashboard/movimentos/baixas',         icon: XCircle        }, // OCULTO
        ],
      },
      // { label: 'Entradas', href: '/dashboard/entradas', icon: PackageOpen }, // OCULTO
    ],
  },
  // ── ESTOQUE ─────────────────────────────────────────────────────────────
  {
    title: 'Estoque',
    items: [
      {
        label: 'Saldos',
        href:  '/dashboard/saldos',
        icon:  Archive,
        children: [
          { label: 'Importação', href: '/dashboard/saldos/importacao', icon: TrendingUp },
        ],
      },
    ],
  },
  // ── CADASTROS ───────────────────────────────────────────────────────────────
  {
    title: 'Cadastros',
    items: [
      {
        label: 'Produtos',
        href: '/dashboard/cadastros',
        icon: ClipboardList,
        children: [
          { label: 'Produtos',   href: '/dashboard/cadastros/produtos',            icon: Pill            },
          { label: 'Importação', href: '/dashboard/cadastros/produtos/importacao', icon: FileSpreadsheet },
          // { label: 'Unidades de Medida', href: '/dashboard/cadastros/unidades',     icon: Ruler     },
          // { label: 'Fornecedores',       href: '/dashboard/cadastros/fornecedores', icon: Truck     },
          // { label: 'Pacientes',          href: '/dashboard/cadastros/pacientes',    icon: UserRound },
          // { label: 'Setores',            href: '/dashboard/cadastros/setores',      icon: Building2 },
          // { label: 'Motivos de Baixa',   href: '/dashboard/cadastros/baixas',       icon: XCircle   },
        ],
      },
    ],
  },
  // ── RELATÓRIOS (oculto) ─────────────────────────────────────────────────────
  // {
  //   title: 'Relatórios',
  //   items: [
  //     { label: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart3 },
  //   ],
  // },
  {
    title: 'Consultas',
    items: [
      {
        label: 'SQL',
        href: '/dashboard/consultas/sql',
        icon: FileCode2,
      },
    ],
  },
  {
    title: 'Sistema',
    items: [
      {
        label: 'Configurações',
        href: '/dashboard/configuracoes',
        icon: Settings,
        children: [
          { label: 'Empresa',        href: '/dashboard/configuracoes/empresa',     icon: Landmark  },
          { label: 'Instalação',     href: '/dashboard/configuracoes/instalacao',  icon: ServerCog },
          { label: 'Banco de Dados', href: '/dashboard/configuracoes/banco',       icon: Database  },
          { label: 'Usuários',       href: '/dashboard/configuracoes/usuarios',    icon: Users,   requiresAdmin: true },
          { label: 'Tabelas RAG',   href: '/dashboard/configuracoes/tabelas',    icon: Table2,  requiresAdmin: true },
          // { label: 'Estoques',    href: '/dashboard/configuracoes/estoques',   icon: Archive   }, // OCULTO
          // { label: 'Permissões',  href: '/dashboard/configuracoes/permissoes', icon: KeyRound  }, // OCULTO
        ],
      },
    ],
  },
]
