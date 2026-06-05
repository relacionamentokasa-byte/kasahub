
# Integração Proposta → Cliente → Projeto → Jobs → Financeiro

## Objetivo
Quando uma proposta for **aprovada**, o sistema deve criar automaticamente todo o ecossistema operacional e financeiro do cliente. Quando for **cancelada/reaberta**, reverter tudo sem duplicar.

---

## 1. Banco de dados (migração)

**Tabela `proposals`** – adicionar campos para template operacional e rastreio:
- `responsible_id uuid` – responsável padrão do projeto/jobs
- `briefing text` – briefing copiado para o projeto
- `payment_kind text` ('recurring' | 'one_time' | 'mixed') – define como gerar financeiro
- `installments int default 1` – nº de parcelas para valor único
- `first_due_date date` – primeiro vencimento
- `billing_day int default 5` – dia do mês para recorrência
- `account_id uuid` – conta bancária padrão dos lançamentos
- `category_id uuid` – categoria financeira padrão
- `generated_project_id uuid` – projeto criado pela aprovação
- `generated_contract_id uuid` – contrato criado pela aprovação
- `auto_create_jobs boolean default true`

**Tabela `proposal_items`** – adicionar:
- `job_template text` – chave do template (ex.: `social_media`, `branding`, `website`, `ads`, `none`). Usado para gerar jobs iniciais.

**Tabela `transactions`** – garantir índices em `proposal_id` e `contract_id` (já existem colunas).

**Tabela `projects`** – já possui `proposal_id`/`contract_id` (ok).

**Migração de dados:** nenhuma; campos novos são opcionais.

---

## 2. Aprovação da proposta (gatilho central)

Criar `src/lib/proposal-approval.ts` com função pura `approveProposal(proposalId)` chamada tanto pela UI interna quanto pelo aceite público (`/api/public/proposal.$token`).

Fluxo dentro de uma "transação lógica" (sequência com rollback manual em caso de erro):

1. **Validar**: proposta existe, status ≠ 'accepted', tem `client_id` (se não tiver, criar cliente automaticamente a partir de `client_name`/`client_email`).
2. **Cliente**: se faltar, `INSERT` em `clients` e vincular à proposta.
3. **Projeto**: criar em `projects` com `name = proposal.title`, `client_id`, `proposal_id`, `briefing`, `owner_id = responsible_id`. Salvar id em `proposal.generated_project_id`.
4. **Contrato** (se `payment_kind in ('recurring','mixed')` e houver `monthly_investment > 0`): criar em `contracts` com `monthly_value`, `billing_day`, `start_date`, `proposal_id`, `client_id`. Salvar em `generated_contract_id`. Vincular `projects.contract_id`.
5. **Jobs iniciais** (se `auto_create_jobs`): para cada `proposal_item` com `job_template` definido, expandir um template (mapa em código) e inserir múltiplos `jobs` ligados a `project_id`/`client_id`, estágio inicial, `assignee_id = responsible_id`.
6. **Lançamentos financeiros**:
   - **Recorrente**: gerar N transações `kind='income'`, `is_recurring=true`, `contract_id`, `client_id`, `proposal_id`, `project_id`, vencendo no `billing_day` dos próximos 12 meses (configurável; padrão 12).
   - **Avulso**: usar `createTransaction(..., installments)` já existente para `one_time_investment`, vinculando `proposal_id`/`project_id`/`client_id`.
7. **Status**: `proposals.status = 'accepted'`, `accepted_at = now()`.

Tudo idempotente: se `generated_project_id` já existir, pular criação (apenas reativar lançamentos cancelados, se houver).

### Templates de jobs (em código)
```ts
const JOB_TEMPLATES = {
  social_media: ["Planejamento", "Design", "Copy", "Aprovação", "Publicação"],
  branding:     ["Briefing", "Pesquisa", "Conceito", "Aplicações", "Manual"],
  website:      ["Briefing", "Wireframe", "Design", "Desenvolvimento", "Homologação", "Publicação"],
  ads:          ["Planejamento", "Criativos", "Configuração", "Lançamento", "Otimização"],
};
```
UI da proposta permitirá escolher o template por item (Select simples no editor de itens).

---

## 3. Cancelamento / Reabertura

Função `revertProposalApproval(proposalId)`:
- `transactions` vinculadas (`proposal_id = X` AND `status = 'pending'`) → `status = 'cancelled'`. Pagas permanecem (auditoria).
- `contracts` vinculados → `status = 'cancelled'`.
- `projects` vinculados → `status = 'archived'`.
- `jobs` do projeto sem `done_at` → `status`/estágio "cancelado" (ou marcar `done_at = null` e mover para estágio descartado; usaremos label `cancelled` em `labels`).
- `proposals.status = 'cancelled'` (ou `draft` se "reabertura").

Reaprovação: chama `approveProposal` novamente; como ids ficam salvos, reativa contratos (`active`), projeto (`active`) e gera somente lançamentos faltantes (verificar pelos meses já existentes).

---

## 4. UI

### Proposta (editor)
- Adicionar painel "Configuração operacional":
  - Select **Responsável** (profiles da equipe)
  - Textarea **Briefing**
  - Select **Modelo de cobrança**: recorrente / avulso / misto
  - **Parcelas** (se avulso/misto), **1º vencimento**, **Dia de cobrança**
  - Selects **Conta** e **Categoria** financeira
  - Switch **Gerar jobs automaticamente**
- Em cada item da proposta: Select **Template de jobs**.
- Botão "Aprovar proposta" agora chama `approveProposal` e mostra resumo do que foi criado.
- Botão "Cancelar/Reabrir" → `revertProposalApproval`.

### Aceite público (`/p/$token`)
- Após o cliente aceitar, chamar mesma função no server route.

### Cliente 360 (`ClientDetailContent`)
- Confirmar/adicionar abas: **Propostas**, **Projetos**, **Jobs**, **Contratos**, **Financeiro**.
- Aba Propostas: lista com filtro por status (aprovada, em andamento, cancelada, reaberta) e link para projeto/contratos gerados.

---

## 5. Arquivos

**Novos**
- `supabase/migrations/<ts>_proposal_pipeline.sql`
- `src/lib/proposal-approval.ts`
- `src/lib/job-templates.ts`

**Editados**
- `src/lib/crm-api.ts` – expor campos novos em create/update
- `src/routes/_authenticated/propostas.$proposalId.tsx` – painel operacional + botões aprovar/cancelar
- `src/components/proposals/ProposalDetailSheet.tsx` – mesma UI no drawer
- `src/routes/api/public/proposal.$token.ts` – chamar `approveProposal` no aceite
- `src/routes/_authenticated/clientes.$clientId.tsx` – garantir abas e dados vinculados

---

## Notas técnicas
- Toda a orquestração roda client-side via `supabase` autenticado (políticas atuais permitem `is_team_member`). Para o aceite público, o server route usa `supabaseAdmin`.
- Recorrência: gerar 12 meses adiante por padrão; um job cron futuro pode estender (fora deste escopo).
- Idempotência: usar `proposal_id` + (`due_date` mês) como chave lógica para não duplicar lançamentos recorrentes.

Confirme para eu seguir com a implementação.
