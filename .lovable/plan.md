# Botão "Despesa da Kasa" no lançamento financeiro

## Objetivo
Permitir registrar despesas internas da agência (que não são de cliente, fornecedor nem freelancer) de forma simples e explícita, com um botão dedicado no diálogo de lançamento.

## Como vai funcionar (visão do usuário)

No diálogo de Novo Lançamento, na seção de "Vincular", além dos botões atuais (Cliente / Fornecedor / Freelancer) vai aparecer um quarto botão:

**🏠 Despesa da Kasa**

Quando o usuário clica nele:
- O lançamento é marcado como "interno" (despesa da própria agência)
- Os campos de Cliente, Fornecedor e Freelancer ficam ocultos (não precisa vincular ninguém)
- O tipo é forçado para "Despesa"
- O usuário preenche normalmente: descrição, valor, vencimento, **categoria** (usando as categorias que já existem) e **natureza** (operacional / não operacional)
- Aparece um selo visual "Despesa da Kasa" no topo do formulário pra ficar claro

Nas listagens e relatórios, esses lançamentos aparecem com o mesmo selo "Kasa" pra serem identificáveis de relance.

## Detalhes técnicos

1. **Banco** — adicionar coluna booleana `is_internal` (default false) na tabela `transactions`, com índice. Migration via supabase--migration.
2. **TransactionFormDialog.tsx** — adicionar o 4º botão na linha de vínculos; quando ativo, esconder os 3 pickers de cliente/fornecedor/freelancer/partner e forçar `type = "expense"`. Incluir `is_internal` no schema Zod, no payload de create/update e no reset do form.
3. **finance-api.ts** — incluir `is_internal` no select de `fetchTransactions` (já vem com `*`, ok) e nas stats se fizer sentido separar depois.
4. **Listagem de transações** — badge "Kasa" quando `is_internal = true` (mudança visual pequena no componente da linha).
5. **types.ts** — regenerado automaticamente após a migration.

Sem mexer em relatórios/DRE neste momento — fica pra um próximo passo se você quiser separar "Custos internos da Kasa" como linha própria no resumo financeiro.

## Fora de escopo
- Criar categorias novas (você disse que já tem).
- Mexer em DRE / Resumo Financeiro.
- Reintroduzir o campo "Investimento" (mantido removido, conforme decisão anterior).
