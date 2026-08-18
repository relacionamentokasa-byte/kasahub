# Plano de Correção Estrutural do Modelo Financeiro

Garantir a consistência entre `amount` e `valor_previsto` em todos os fluxos de criação e edição, além de separar claramente a "intenção" (previsto) do "fato" (real) durante a baixa.

## Alterações Técnicas

### 1. Sincronização na Criação e Edição
Garantir que `valor_previsto` seja sempre preenchido com o valor base do lançamento e que `amount` o acompanhe enquanto não houver pagamento.

- **`src/components/finance/TransactionFormDialog.tsx`**:
  - Na criação: definir explicitamente `valor_previsto: values.amount` e `amount: values.amount`.
  - Na edição de pendentes: atualizar ambos consistentemente se o valor for alterado.
- **`src/lib/ops-api.ts`**:
  - Atualizar funções que geram lançamentos (Jobs, Setups) para incluir `valor_previsto` igual ao `amount`.
- **`src/lib/dme-batches-api.ts`**:
  - Na criação de lotes consolidados, preencher `valor_previsto` na transação criada.
- **`src/components/finance/FinancialImportDialog.tsx`**:
  - Incluir `valor_previsto` no objeto de inserção em lote.

### 2. Fluxo de Baixa (Preservação de Histórico)
Alterar a lógica de baixa para não sobrescrever o `amount` original, usando apenas `valor_real` para o fato financeiro.

- **`src/components/finance/BaixaDialog.tsx`**:
  - Remover a alteração de `amount` no payload do `updateTransaction`.
  - Atualizar `valor_real` (e possivelmente `status: 'paid'`).
  - *Nota*: A interface já calcula a diferença visualmente; garantiremos que a persistência siga a nova regra.

### 3. Proteção de Interface (Fallback)
Manter temporariamente a lógica de exibição para registros antigos que não possuem `valor_previsto`.

- **`src/routes/_authenticated/relatorios.tsx`** e componentes de listagem:
  - Continuar usando `valor_previsto > 0 ? valor_previsto : amount` apenas para renderização.

## Testes de Validação
- Criar DME e verificar `amount == valor_previsto`.
- Criar Lote DME e verificar `amount == valor_previsto`.
- Criar Job e verificar `amount == valor_previsto`.
- Realizar baixa com valor diferente e confirmar que `amount` e `valor_previsto` permanecem intactos, enquanto `valor_real` armazena o valor pago.
