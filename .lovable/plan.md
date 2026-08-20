# Plan: Módulo Financeiro Server-side Pagination

Optimizar o carregamento do módulo Financeiro através de paginação server-side, reduzindo o payload inicial e o tempo de renderização, mantendo a integridade dos indicadores e filtros.

## Technical Details

### 1. Backend (`src/lib/finance-api.ts`)
- Alterar `fetchTransactions` para suportar `page` e `pageSize` (default 50).
- Utilizar `.range()` do Supabase para buscar apenas o subset de dados.
- Retornar um objeto `{ data: Transaction[], count: number }` usando `{ count: 'exact' }`.
- Garantir que a lógica de ordenação e filtros (incluindo "Atrasados" que aparecem no mês atual) seja mantida na query paginada.

### 2. Indicadores (`src/lib/finance-api.ts`)
- `fetchFinanceStats` já faz uma query leve (apenas colunas necessárias). Manter essa query separada para garantir que os totais ("A Receber", "Previsto", etc.) considerem todos os registros filtrados, não apenas os da página atual.
- Garantir que a regra de `financial_collection_status = suspended` continue sendo aplicada nos stats.

### 3. Frontend (`src/routes/_authenticated/relatorios.tsx`)
- Adicionar estado local `page` (iniciando em 1).
- Atualizar `queryKey` da transação para incluir o `page`.
- Implementar controles de paginação (Anterior/Próximo) na UI.
- Resetar `page` para 1 sempre que um filtro mudar.
- Adaptar a renderização da tabela para lidar com a nova estrutura de retorno `{ data, count }`.

### 4. Validação
- Verificar se o JSON de transações diminuiu drasticamente (~50KB vs ~600KB).
- Validar se os indicadores no topo da página permanecem corretos (total do período).
- Testar todos os fluxos de edição, baixa e filtros.

## Files to Modify
- `src/lib/finance-api.ts`
- `src/routes/_authenticated/relatorios.tsx`
