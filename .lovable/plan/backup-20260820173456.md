# Plano de Implementação — Suspensão de Cobranças Financeiras

Adição de uma configuração persistente para suspender a consideração de lançamentos financeiros de um cliente nos indicadores de "A Receber" e cobranças ativas, sem alterar o status operacional ou excluir dados.

## Alterações no Banco de Dados (Supabase)

1.  **Nova Migração:**
    *   Adicionar à tabela `public.clients`:
        *   `financial_collection_status`: TEXT (default 'active', check IN ('active', 'suspended'))
        *   `financial_collection_date`: TIMESTAMPTZ
        *   `financial_collection_reason`: TEXT
        *   `financial_collection_user_id`: UUID (FK para profiles)

## Módulos e Lógica (Backend/Frontend)

1.  **Tipos e API (`src/lib/ops-api.ts`):**
    *   Atualizar interface `Client`.
    *   Implementar `updateClientFinancialStatus`.

2.  **Visão do Cliente (`src/routes/_authenticated/clientes.$clientId.tsx`):**
    *   **Indicadores:** Alterar cálculo de `pendingRevenue` para somar apenas se `financial_collection_status === 'active'`.
    *   **Nova Seção:** Exibir "Cobranças suspensas: R$ X" caso existam valores e o cliente esteja suspenso.
    *   **Interface de Toggle:** Adicionar botão discreto no cabeçalho da aba Financeiro para [ Suspender / Reativar ].
    *   **Diálogos:** Criar `FinancialSuspensionDialog` (com motivo) e `FinancialReactivationDialog`.

3.  **Indicadores Globais e Relatórios:**
    *   `src/lib/finance-api.ts`: Atualizar `fetchFinanceStats` para filtrar transações de clientes suspensos.
    *   `src/routes/_authenticated/relatorios.tsx`: Ajustar loops de soma para respeitar o flag do cliente.
    *   `src/components/dashboard/SaudeNegocioSection.tsx`: Garantir que o faturamento operacional (MRR) ignore clientes suspensos.

## Detalhes Técnicos (Segurança e RLS)

*   Garantir que as novas colunas na tabela `clients` estejam protegidas pelas políticas de RLS existentes (apenas usuários autenticados/gestores podem alterar).
*   Manter a integridade de todas as transações, DMEs e Lotes (nada é alterado ou excluído).

## Testes de Verificação

1.  Verificar que um cliente suspenso mantém suas transações na aba Financeiro com rótulo "SUSPENSA".
2.  Validar que o valor "A Receber" global no Dashboard diminui ao suspender um cliente.
3.  Confirmar que a reativação restaura os valores imediatamente.
