# Plano de Melhoria: Desconsolidação Atômica de Lotes de DMEs

Este plano detalha a implementação de um fluxo seguro e atômico para desfazer a consolidação de Demandas Extras (DMEs), garantindo a integridade dos dados através de uma transação no banco de dados (RPC).

## 1. Módulo de Banco de Dados (RPC no PostgreSQL)

- **Criar a função `unconsolidate_dme_batch`**:
    - **Parâmetros**: `p_batch_id UUID`, `p_restore_individual_transactions BOOLEAN`.
    - **Comportamento Atômico (Transação)**:
        1. **Validação**: Verifica se o lote existe e se a transação consolidada não está paga (`paid`).
        2. **Identificação**: Coleta todas as DMEs vinculadas via `dme_batch_items`.
        3. **Consolidação**: Identifica a transação consolidada vinculada ao lote.
        4. **Ação Financeira**:
            - Marca a transação consolidada como `cancelled`.
            - Se `p_restore_individual_transactions` for TRUE:
                - Localiza as transações individuais vinculadas às DMEs (`extra_demands.transaction_id`).
                - Restaura para `pending` APENAS as transações que estão atualmente como `cancelled`.
                - Não altera valores, datas, descrições ou IDs.
        5. **Desvinculação**:
            - Remove `consolidated_transaction_id` de todas as DMEs do lote.
            - Remove os registros em `dme_batch_items`.
        6. **Exclusão do Lote**: Remove o registro de `dme_batches`.
        7. **Retorno Estruturado**: JSON contendo estatísticas da operação (IDs restaurados, mantidos, etc.).

## 2. Interface de Usuário (`src/routes/_authenticated/dmes.tsx`)

- **Novo Modal de Confirmação (Shadcn/UI)**:
    - Substituir o `confirm()` por um `Dialog` com três opções claras:
        - **[RESTAURAR LANÇAMENTOS INDIVIDUAIS]**: Chama a RPC com `p_restore_individual_transactions = true`.
        - **[MANTER LANÇAMENTOS CANCELADOS]**: Chama a RPC com `p_restore_individual_transactions = false`.
        - **[CANCELAR]**: Fecha o modal.
- **Feedback ao Usuário**: Exibir toast com o resumo do que foi restaurado baseado no retorno da RPC.

## 3. Validação e Testes OBRIGATÓRIOS

- **Teste 1 (Restauração)**: Lote com 3 DMEs (2 com TX cancelada, 1 sem TX). Resultado esperado: 2 TX restauradas para pending, 1 permanece sem TX, consolidada cancelada, 0 novas transações.
- **Teste 2 (Rollback)**: Forçar erro (ex: deletar transação consolidada antes da RPC) e verificar se nada foi alterado.
- **Teste 3 (Duplicidade)**: Garantir que nenhuma transação foi criada ou duplicada.

## Invariantes

- **Atomicidade**: A lógica reside 100% no PostgreSQL.
- **Segurança**: Vínculo exclusivo por `transaction_id` nas DMEs.
- **Preservação**: Nenhuma alteração em valores ou datas originais.
