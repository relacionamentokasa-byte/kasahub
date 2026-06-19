## 1. Unificar "Novo lançamento" e "Editar lançamento"

Hoje existem dois componentes diferentes:
- `TransactionFormDialog` (novo) — formulário completo com tipo, categoria, conta, natureza, cliente, fornecedor, sócio, etc.
- `EditTransactionDialog` (editar) — formulário minimalista só com descrição, valor previsto, valor real e motivo da diferença.

**Mudança:** transformar `TransactionFormDialog` em dialog único que suporta criação E edição:
- Aceitar prop opcional `transaction` — quando presente, entra em modo edição (título "Editar lançamento", preenche todos os campos, faz `updateTransaction` no submit).
- Manter os campos extras do antigo `EditTransactionDialog` (valor previsto x valor real, motivo da diferença) como uma seção condicional dentro do mesmo form.
- Remover o arquivo `EditTransactionDialog.tsx` e ajustar `src/routes/_authenticated/relatorios.tsx` para reutilizar o `TransactionFormDialog` passando a transação selecionada.

## 2. Recibo apenas para transações pagas

- Em `relatorios.tsx`, esconder/desabilitar a ação "Gerar recibo" quando `transaction.status !== 'paid'` (com tooltip "Disponível somente para lançamentos pagos").
- Em `ReciboDialog`, guard inicial: se a transação não estiver paga, mostrar aviso e bloquear a impressão.

## 3. Natureza da despesa

Hoje o campo `nature` (`operacional` / `nao_operacional`) só aparece para receitas e é usado em `distribution-api.ts` para definir o que entra na distribuição aos sócios.

**Mudança:**
- Mostrar o seletor "Natureza da despesa" também quando `type === 'expense'` no `TransactionFormDialog` unificado:
  - Operacional (entra no cálculo de lucro/distribuição)
  - Não-operacional (investimento, aporte, compra de ativo, despesa de sócio… não impacta resultado operacional)
- Default da despesa: `operacional`.
- Ajustar `src/lib/distribution-api.ts` e os agregadores em `src/routes/_authenticated/relatorios.tsx` (KPIs/relatórios de resultado) para considerar somente despesas com `nature = 'operacional'` no cálculo de lucro/base de distribuição, mantendo o total bruto de despesas separado quando já exibido.
- Sem migration: a coluna `nature` já existe em `transactions` e aceita os mesmos valores.

## Arquivos afetados

- `src/components/finance/TransactionFormDialog.tsx` — aceitar modo edição + campo natureza para despesa.
- `src/components/finance/EditTransactionDialog.tsx` — remover.
- `src/components/finance/ReciboDialog.tsx` — guard para `status === 'paid'`.
- `src/routes/_authenticated/relatorios.tsx` — usar dialog unificado, gate do recibo, ajuste de KPIs por natureza.
- `src/lib/distribution-api.ts` — excluir despesas não-operacionais do cálculo.

## Pergunta antes de implementar

Sobre a parte de KPIs/relatórios financeiros: você quer que despesas **não-operacionais** fiquem completamente fora do total de despesas exibido no dashboard/relatório, ou prefere que apareçam destacadas em uma linha separada ("Despesas não-operacionais") e só sejam excluídas do cálculo de lucro/distribuição? Se não responder, sigo com a segunda opção (mais transparente).
