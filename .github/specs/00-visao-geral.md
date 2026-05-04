# SPEC — Visão Geral · Portal Gestão de Estoque

## Propósito

Front-end web da plataforma de gestão de estoque hospitalar. Consome a API REST do projeto **portal** (Go) via configuração de base URL.

## Stack

| Camada       | Tecnologia                     |
|--------------|-------------------------------|
| Framework    | Next.js 15 (App Router)       |
| UI           | React 19 + TypeScript 5       |
| Estilos      | Tailwind CSS v4 + CSS vars    |
| Ícones       | Lucide React                  |
| Utilitários  | clsx, tailwind-merge          |
| Animações    | tw-animate-css                |

## Tema (claro / escuro)

- Padrão: **modo escuro** (`dark` aplicado via `localStorage`).
- Chave localStorage: `portal-theme` → valores `'light'` ou `'dark'`.
- Script no `<head>` aplica `.dark` antes do primeiro render (sem flash).
- Toggle visível na Topbar (ícone Sol ↔ Lua).
- Transição suave via classe `.theme-transition` (300 ms).
- Tokens de cor definidos em `globals.css` via variáveis CSS.

## Layout Shell

```
┌──────────┬──────────────────────────────────────┐
│          │ Topbar (h-14, sticky)                │
│ Sidebar  ├──────────────────────────────────────┤
│ (w-56 /  │                                      │
│  w-14    │ <main> — conteúdo da rota            │
│ collapsed│                                      │
│)         │                                      │
└──────────┴──────────────────────────────────────┘
```

- **Sidebar** — expansível/recolhível; drawer no mobile.
- **Topbar** — título dinâmico da rota, toggle tema, notificações, menu usuário.

## Estrutura de diretórios

```
app/
├── app/
│   ├── layout.tsx                  # Root layout — fonte Inter, script tema
│   ├── page.tsx                    # Redirect → /dashboard
│   ├── globals.css                 # Design tokens + utility classes
│   └── dashboard/
│       ├── layout.tsx              # Shell (Sidebar + Topbar)
│       ├── page.tsx                # Painel Geral (KPIs + últimos movimentos)
│       ├── movimentos/
│       │   └── page.tsx            # Lista de movimentos com filtros
│       ├── entradas/               # (Em construção)
│       ├── saldos/                 # (Em construção)
│       ├── cadastros/
│       │   └── produtos/
│       │       └── page.tsx        # Cadastro de produtos
│       └── configuracoes/          # (Em construção)
├── components/
│   └── shell/
│       ├── sidebar-context.tsx     # Estado collapsed/mobileOpen
│       ├── sidebar.tsx             # Menu lateral com subitens
│       ├── topbar.tsx              # Barra superior
│       └── nav-config.ts          # Árvore de navegação
└── lib/
    └── utils.ts                   # cn() helper
```

## Grupos de Navegação

| Grupo          | Itens principais                              |
|----------------|----------------------------------------------|
| —              | Início                                        |
| Movimentação   | Movimentos (Saídas / Devoluções / Transf. / Baixas), Entradas |
| Estoque        | Saldos                                        |
| Cadastros      | Produtos, Unidades, Fornecedores, Pacientes, Setores, Motivos de Baixa |
| Relatórios     | Relatórios                                    |
| Sistema        | Configurações (Estoques / Usuários / Permissões) |
