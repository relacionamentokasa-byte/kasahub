## Reestruturação do Financeiro

Vou refazer a página `/financeiro` para refletir o layout da referência (Lista, Visão Mensal, Previsão Anual, Contas Banc.) e transformá-la no centro financeiro integrado ao CRM, Propostas, Contratos, Projetos e Jobs.

### 1. Banco de dados (migração)

- `financial_categories`: adicionar `cost_center` (text) — Operação, Marketing, Comercial, Administrativo, Ferramentas, Equipe, Freelancers.
- `bank_accounts`: adicionar `agency` (text) e `account_number` (text).
- `transactions`: adicionar `job_id` (uuid, nullable) para vincular receitas de jobs avulsos.
- Seed inicial de categorias por centro de custo + sementes "Recorrente", "Avulso", "Projeto Especial" (kind=income).

### 2. Nova UI `financeiro.tsx`

Topo: título "Financeiro / Controle de receitas e despesas" + ações `Importar` e `+ Nova Transação`.

Tabs (4 abas conforme a referência):

- **Lista** — KPIs no topo + filtros + tabela.
  - KPIs: `Entradas Pagas`, `Saídas Pagas`, `A Receber / A Pagar`, `Lucro do Período`, `Receita Recorrente` (MRR), `Receita Extra` (avulsos do período), `Saldo Consolidado`.
  - Filtros: busca, Tipo, Status, Cliente, Categoria, Conta, Período.
  - Tabela: Descrição · Categoria · Cliente · Valor · Vencimento · Status · ações (marcar pago/excluir/editar). Cada linha mostra origem (proposta/contrato/job) com link.

- **Visão Mensal** — gráfico mês a mês (receitas vs despesas), tabela comparativa, lucro/saldo do mês selecionado.

- **Previsão Anual** — projeção 12 meses combinando contratos ativos (MRR), parcelas futuras de propostas aprovadas e despesas recorrentes. Cards Receita Prevista, Despesa Prevista, Lucro Previsto.

- **Contas Banc.** — cards com saldo atual, entradas/saídas do período por conta + botão Nova conta. Card "Saldo Consolidado" somando todas as contas.

### 3. Importação CSV/Excel

`ImportTransactionsDialog`: aceita `.csv`/`.xlsx` (uso de `xlsx`), mapeamento de colunas (descrição, valor, vencimento, tipo, cliente por nome, categoria por nome, conta, status), pré-visualização e inserção em lote em `transactions`.

### 4. Integrações já existentes (consolidação)

O `approveProposal` já cria contratos, parcelas e recorrências. Vou:
- Garantir que jobs avulsos (proposta com `payment_kind=one_time`) gerem N parcelas vinculadas a `proposal_id`/`project_id`.
- Garantir que cancelar/reabrir proposta cancele apenas as `transactions` pendentes futuras (já está) e exibir aviso na UI.
- Mostrar origem na tabela: badge "Recorrência", "Parcela X/Y", "Avulso", "Manual".

### 5. Relatório Rentabilidade por Cliente

Nova aba dentro de `clientes.$clientId.tsx`: Receita Total, Despesas Vinculadas, Lucro, Margem, # Jobs, # Projetos.

### 6. Visão 360 do Cliente

Já existe filtro por `client_id`; adicionar a seção "Financeiro" com sub-abas: Recorrências, Parcelas, Pagas, Pendentes.

### Arquivos

- Migração SQL nova
- `src/routes/_authenticated/financeiro.tsx` — reescrita
- `src/components/finance/ImportTransactionsDialog.tsx` — novo
- `src/components/finance/NewBankAccountDialog.tsx` — agência/conta
- `src/components/finance/NewTransactionDialog.tsx` — campo centro de custo
- `src/lib/finance-api.ts` — funções de previsão anual, agregação por cliente, importação em lote
- `src/routes/_authenticated/clientes.$clientId.tsx` — aba Rentabilidade + bloco financeiro
- `src/lib/proposal-approval.ts` — ajuste menor (linkar `job_id` quando aplicável)
- `package.json` — adicionar `xlsx`

### Confirmação

Posso começar? Como o escopo é grande vou entregar em ondas: (1) migração + UI base com 4 abas + KPIs + filtros, (2) Importação CSV/XLSX, (3) Rentabilidade por cliente e Visão 360. Se preferir uma ordem diferente, me diga.