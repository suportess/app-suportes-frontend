# SPEC — Telas · Portal Gestão de Estoque

---

## Tela 1 — Painel Geral (`/dashboard`)

**Arquivo:** `app/dashboard/page.tsx`

### Objetivo
Visão consolidada e em tempo real do estado do estoque hospitalar, mostrando os KPIs mais relevantes e os últimos movimentos.

### Componentes

#### KPI Cards (4 cards em grid 2×2 → 1×4 no desktop)

| Card                  | Métrica                                | Cor       |
|-----------------------|----------------------------------------|-----------|
| Produtos em Estoque   | Contagem de produtos com saldo > 0     | brand     |
| Movimentos Hoje       | Total de movimentos do dia corrente    | info      |
| Entradas Pendentes    | Entradas sem DT_CONCLUSAO              | warning   |
| Itens com Saldo Baixo | Produtos abaixo do estoque mínimo      | danger    |

Cada card exibe: ícone, valor principal, subtítulo e tendência vs. período anterior.

#### Tabela — Últimos Movimentos

Colunas: `#`, `Tipo` (badge colorido), `Estoque`, `Qtd`, `Hora`, `Status`.

- Status **Confirmado**: ícone verde + texto.
- Status **Rascunho**: ícone amarelo + texto.
- Exibe os últimos N registros (sem paginação nesta versão).

### Regras
- Dados virão da rota `GET /movimentos?pageSize=10&ordenacao=dt_mvto_estoque:desc`.
- KPIs serão compostos por múltiplas chamadas ou um endpoint agregador.
- Tela é somente leitura (nenhuma ação destrutiva).
- Botão "Novo Movimento" redireciona para o modal/fluxo de criação.

---

## Tela 2 — Movimentos de Estoque (`/dashboard/movimentos`)

**Arquivo:** `app/dashboard/movimentos/page.tsx`

### Objetivo
Listagem completa dos movimentos de estoque, com filtragem por tipo e status.

### Filtros disponíveis

| Filtro  | Valores possíveis                                              |
|---------|----------------------------------------------------------------|
| Busca   | Texto livre — filtra por ID ou Observação                      |
| Tipo    | Todos / Saída Paciente / Saída Setor / Transferência / Dev. / Baixa |
| Status  | Todos / Confirmado / Rascunho                                  |

### Tabela — Colunas

`#` · `Tipo` · `Estoque` · `Destino` · `Data/Hora` · `Status` · `Observação` · ações (olho)

### Badges de Tipo

| Código | Label              | Cor     |
|--------|--------------------|---------|
| P      | Saída Paciente     | brand   |
| S      | Saída Setor        | info    |
| T      | Transferência Est. | purple  |
| E      | Transferência Emp. | purple  |
| D      | Dev. Setor         | warning |
| C      | Dev. Paciente      | success |
| B      | Baixa              | danger  |

### Estado vazio
Se nenhum registro bater os filtros, exibe ícone + mensagem + botão "Limpar filtros".

### Regras
- Chamada: `GET /movimentos?tp_mvto_estoque=X&page=N&pageSize=20`.
- `tp_mvto_estoque` vem como `VARCHAR(1)` desde a migration V36.
- Rascunhos (DT_CONCLUSAO IS NULL) podem ser editados/excluídos.
- Confirmados são somente leitura.
- Paginação futura: controles Anterior / Próxima + indicador de página.

---

## Tela 3 — Produtos (`/dashboard/cadastros/produtos`)

**Arquivo:** `app/dashboard/cadastros/produtos/page.tsx`

### Objetivo
Cadastro e consulta de medicamentos e materiais hospitalares.

### Filtros disponíveis

| Filtro        | Valores possíveis          |
|---------------|---------------------------|
| Busca         | Nome do produto (texto)   |
| Controla Lote | Todos / Sim / Não          |
| Consignado    | Todos / Sim / Não          |

### Tabela — Colunas

`#` · `Produto` · `Unidade` · `Consignado` · `Ctrl. Lote` · `Ctrl. Validade` · `Saldo Total` · ações (editar)

### Alerta de saldo baixo
Exibido no topo quando há produtos com saldo total < 100 unidades. Mostra contagem.

### Saldo Total
- Normal: cor `--text-primary`.
- Abaixo de 100: cor `--danger`, negrito.

### Estado vazio
Ícone + mensagem + botão "Limpar filtros".

### Regras
- Chamada: `GET /produtos?page=1&pageSize=50`.
- `SN_CONSIGNADO`, `SN_LOTE`, `SN_VALIDADE` são `VARCHAR(1)` ('S'/'N') desde V36.
- Botão "Novo Produto" abre formulário de criação (modal ou rota dedicada).
- Botão de editar abre formulário pré-preenchido com os dados do produto.

---

## Telas em Construção

As rotas abaixo fazem parte da nav mas ainda não têm tela implementada:

| Rota                              | Descrição prevista                         |
|-----------------------------------|--------------------------------------------|
| `/dashboard/entradas`             | Lista e criação de entradas (NF/recebimento) |
| `/dashboard/saldos`               | Saldo por produto/estoque com filtros       |
| `/dashboard/movimentos/saidas`    | Filtro rápido de movimentos tipo S e P      |
| `/dashboard/movimentos/devolucoes` | Filtro rápido de tipos C e D              |
| `/dashboard/movimentos/transferencias` | Filtro rápido de tipos T e E          |
| `/dashboard/movimentos/baixas`    | Filtro rápido de tipo B                    |
| `/dashboard/cadastros/unidades`   | Unidades de medida dos produtos            |
| `/dashboard/cadastros/fornecedores` | Cadastro de fornecedores               |
| `/dashboard/cadastros/pacientes`  | Cadastro de pacientes                      |
| `/dashboard/cadastros/setores`    | Cadastro de setores hospitalares           |
| `/dashboard/cadastros/baixas`     | Motivos de baixa de estoque               |
| `/dashboard/relatorios`           | Relatórios gerenciais (consumo, saldo)     |
| `/dashboard/configuracoes`        | Estoques, usuários, permissões             |
