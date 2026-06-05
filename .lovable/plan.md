# Serviços e Templates — Central configurável

## Objetivo
Criar uma biblioteca central de serviços da Kasa, onde cada serviço tem seu próprio template operacional (jobs padrão + checklists). O admin gerencia tudo via Configurações, sem precisar mexer no código.

## Banco de dados (migração)

Novas tabelas em `public`:

- **`services`**: `id`, `name`, `category`, `description`, `is_active` (bool, default true), `archived_at`, `order_index`, timestamps.
- **`service_job_templates`**: `id`, `service_id` (FK services), `name`, `order_index`, `default_duration_days` (int), `default_assignee_id` (uuid, nullable), `initial_stage_id` (uuid → job_stages, nullable), timestamps.
- **`service_job_checklist`**: `id`, `template_job_id` (FK service_job_templates), `content`, `order_index`, timestamps.

Em `proposals`: manter `service_type` (legado) e adicionar coluna `service_ids` (uuid[], default '{}') para multi-seleção.

Todas com RLS: `is_team_member(auth.uid())` gerencia; leitura para `authenticated`. GRANTs apropriados.

Seed inicial: criar 7 serviços padrão (Gestão de Redes Sociais, Tráfego Pago, Site Institucional, Landing Page, Branding, Consultoria, Produção de Conteúdo) e popular templates a partir do `JOB_TEMPLATES` atual em `src/lib/job-templates.ts` para preservar compatibilidade.

## Frontend

### 1. Nova página: `Configurações → Serviços e Templates`
- Rota: `src/routes/_authenticated/config.servicos.tsx` (URL `/config/servicos`).
- Adicionar link no AppSidebar OU no menu de Configurações (sub-aba). Vou adicionar como **nova aba dentro de `/config`** chamada "Serviços" para manter coesão.
- Lista de serviços (cards/tabela): nome, categoria, badge ativo/inativo, ações (editar, arquivar, excluir).
- Botão "Novo Serviço" abre dialog com campos: Nome, Categoria, Descrição, Ativo.
- Clicar num serviço abre detalhe com 2 abas:
  - **Geral**: editar campos básicos.
  - **Template Operacional**: lista ordenável de jobs do template. Cada item: Nome, Ordem (drag/handle simples com setas ↑↓), Prazo padrão (dias), Responsável padrão (select de team), Status inicial (select de `job_stages`). Sub-item: checklist padrão (lista de strings adicionáveis/removíveis).

### 2. Proposta — multi-seleção de serviços
- Em `src/routes/_authenticated/propostas.tsx` (dialog Nova Proposta) e no editor `propostas.$proposalId.tsx`:
  - Substituir o select único "Tipo de Serviço" por um **multi-select** de serviços ativos (checkboxes em popover ou lista de chips).
  - Persistir em `proposals.service_ids`. Manter `service_type` sincronizado com o primeiro selecionado por compatibilidade até a próxima limpeza.

### 3. Preparação para automação
Adicionar helper `src/lib/services-api.ts` com `fetchServices`, `fetchServiceTemplate(serviceId)`, CRUD de serviços/jobs/checklist. Não disparar criação automática de jobs neste ciclo — apenas deixar tudo pronto. Comentário `// TODO: usado em proposal-approval.ts numa próxima fase` na função `fetchServiceTemplate`.

## Arquivos

**Novos:**
- `supabase/migrations/<timestamp>_services_templates.sql`
- `src/lib/services-api.ts`
- `src/components/config/ServicesManager.tsx` (lista + dialogs)
- `src/components/config/ServiceTemplateEditor.tsx` (aba Template Operacional)
- `src/components/proposals/ServicesMultiSelect.tsx`

**Editados:**
- `src/routes/_authenticated/config.tsx` — nova aba "Serviços".
- `src/routes/_authenticated/propostas.tsx` — usar `ServicesMultiSelect`.
- `src/routes/_authenticated/propostas.$proposalId.tsx` — idem.
- `src/integrations/supabase/types.ts` — regenerado após migração.
- `src/lib/crm-api.ts` (tipo Proposal) — adicionar `service_ids`.

## Fora de escopo (próxima fase)
- Geração automática de Jobs ao aprovar proposta (estrutura já pronta).
- Drag-and-drop visual avançado (usar setas ↑↓ por enquanto).

Posso seguir?
