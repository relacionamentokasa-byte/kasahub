# Plano de Alteração: Renomear Status "EM REVISÃO" para "EM CORREÇÃO"

O objetivo é renomear a exibição do status "EM REVISÃO" para "EM CORREÇÃO" em todo o sistema, mantendo a integridade técnica (IDs, chaves e lógica).

## Alterações Técnicas

### 1. Banco de Dados (Supabase)
- Atualizar o nome na tabela `public.job_stages` para o registro correspondente.
  - De: `🔍 Em Revisão`
  - Para: `🔍 Em Correção`
  - ID identificado: `e99b452b-606b-45f7-b55b-d80ac9331267`

### 2. Backend / API (`src/lib/ops-api.ts`)
- Alterar `JOB_STATUS_LABELS.review.label` de `'Em Revisão'` para `'Em Correção'`.
- Atualizar as funções auxiliares `stageToStatus` e `statusToStageId` para que a busca por texto (case-insensitive) considere "correç" em vez de "revis" (ou ambos para retrocompatibilidade de busca).

### 3. Portal do Cliente (`src/routes/minha-kasa.$slug.tsx`)
- Alterar `STATUS_MAP.review.label` de `"Em Revisão"` para `"Em Correção"`.

### 4. Interface Administrativa (`src/components/jobs/JobSheet.tsx`)
- Alterar o label no seletor de status de `'Em Revisão'` para `'Em Correção'`.

### 5. Módulo Editorial (`src/lib/editorial-api.ts`)
- Alterar `STATUS_LABEL.review` de `"Revisão"` para `"Correção"`.

## Resumo de Impacto
- **Nível de Risco:** Baixo (apenas visual).
- **Consistência:** A alteração cobre Kanban, filtros, listagens, portal do cliente e editor de jobs.
- **Persistência:** O ID do status no banco permanece o mesmo, garantindo que nenhum dado seja perdido ou desvinculado.

## User Review Required
> [!IMPORTANT]
> A alteração é estritamente visual. A chave interna continua sendo `review` em muitos lugares do código, o que é seguro e segue as melhores práticas para evitar quebra de sistema.
