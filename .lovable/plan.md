# Plano de Melhoria: Desconsolidação de Lotes de DMEs

Este plano detalha a implementação de um fluxo seguro para desfazer a consolidação de Demandas Extras (DMEs), permitindo a restauração dos lançamentos financeiros individuais que foram cancelados.

## 1. Módulo de API (`src/lib/dme-batches-api.ts`)

- **Refatoração da função `deleteDmeBatch`**:
    - Adicionar um parâmetro opcional `restoreIndividualTransactions: boolean`.
    - Implementar a lógica de restauração:
        - Buscar todas as DMEs vinculadas ao lote.
        - Para cada DME com `transaction_id` vinculado:
            - Se `restoreIndividualTransactions` for verdadeiro: atualizar o status da transação de `cancelled` para `pending`.
            - Independente da escolha: desvincular o `consolidated_transaction_id` da DME.
    - Cancelar a transação consolidada do lote.
    - Excluir os itens do lote e o registro do lote na tabela `dme_batches`.
    - Garantir que a operação seja atômica (usando transação via RPC se necessário, ou garantindo a ordem de execução manual no client com tratamento de erro robusto). *Nota: Como estamos no client, faremos as chamadas em ordem lógica.*

## 2. Interface de Usuário (`src/routes/_authenticated/dmes.tsx`)

- **Novo Modal de Confirmação**:
    - Substituir o `confirm()` nativo por um componente `Dialog` customizado.
    - O modal apresentará:
        - Título: "Desfazer lote?"
        - Mensagem explicativa sobre a restauração dos lançamentos.
        - Botão "Restaurar lançamentos individuais" (Opção 1).
        - Botão "Manter lançamentos cancelados" (Opção 2 - Comportamento atual).
        - Botão "Cancelar" (Fecha o modal sem agir).
- **Atualização da Mutation**:
    - Ajustar `deleteBatchMut` para aceitar o parâmetro de restauração.

## 3. Auditoria e Segurança

- **Registro de Auditoria**:
    - Utilizar a função `logAudit` existente (se disponível no contexto ou implementar registro via Supabase) para gravar a ação, o lote afetado e a opção escolhida pelo usuário.
- **Validação de Integridade**:
    - Impedir a criação de novas transações (restaurar apenas as existentes).
    - Preservar valores e vencimentos originais das transações individuais.

## Detalhes Técnicos

- **Tecnologias**: TanStack Query (Mutations), Supabase (PostgreSQL), Lucide React (Ícones), Shadcn/UI (Dialog/Button).
- **Segurança**: RLS já protege as tabelas; a lógica de negócio garante que apenas transações `cancelled` vinculadas sejam restauradas para `pending`.
- **Prevenção de Duplicidade**: A restauração atua sobre a coluna `id` da transação já gravada na DME, garantindo que não haja novos registros.
