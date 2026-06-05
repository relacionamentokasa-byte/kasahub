## Cliente como Hub Central da Operação

Transformar o cadastro de clientes no ponto de origem de toda a operação, com serviços contratados orientando Projetos, Jobs e Financeiro.

### 1. Banco de Dados

**Nova tabela `client_services`** (vínculo cliente ↔ serviço contratado):
- `client_id`, `service_id`
- `contract_type` (`recurring` | `one_time`)
- `monthly_value`, `one_time_value`
- `start_date`, `billing_day`
- `status` (`active` | `paused` | `ended`)
- `notes`

GRANTs + RLS (team manages).

**Campos novos em `clients`** (manter compatibilidade):
- `contract_type`, `contract_value`, `start_date`, `address`

### 2. Cadastro de Cliente (Novo/Editar)

Reorganizar `NewClientDialog` e `EditClientDialog` com abas:
- **Dados** — Nome, CNPJ, Status, Email, Telefone, Website, Endereço, Notas, Logo, Cor
- **Contrato** — Tipo de Contrato, Valor, Data de Início
- **Serviços Contratados** — multi-select carregando da biblioteca `services`; por serviço escolher tipo (mensal/único), valor, dia de cobrança
- **Portal** (mantém atual)

### 3. Cliente 360 (`clientes.$clientId`)

Adicionar/garantir abas:
- Visão Geral (dados + serviços contratados em destaque)
- Propostas
- Projetos
- Jobs
- Financeiro (lançamentos do cliente)
- Calendário
- Arquivos
- Timeline (eventos consolidados)

Card "Serviços Contratados" mostrando templates vinculados a cada serviço.

### 4. Criação de Projeto

Em `NewProjectDialog`, ao selecionar cliente:
- Buscar `client_services` ativos
- Pré-marcar serviços contratados
- Ao criar projeto, gerar Jobs a partir dos `service_job_templates` correspondentes (com checklists)

### 5. Integração Financeira

Helper `generateClientServiceFinancials(clientServiceId)`:
- Se `contract_type=recurring` → cria N transações pendentes (1 por mês até `recurring_months` ou contrato indefinido com flag `is_recurring`)
- Se `one_time` → cria transação única
- Botão "Gerar recorrência" no card do serviço contratado

### 6. Arquivos editados/criados

**Novos:**
- `supabase/migrations/...` — `client_services` + colunas em `clients`
- `src/lib/client-services-api.ts`
- `src/components/clients/ClientServicesManager.tsx` (multi-select + valores)
- `src/components/clients/Client360Tabs.tsx` (ou expandir `ClientDetailContent`)

**Editados:**
- `src/components/clients/NewClientDialog.tsx` — abas e campos novos
- `src/components/clients/EditClientDialog.tsx` — idem
- `src/routes/_authenticated/clientes.$clientId.tsx` — abas 360 completas
- `src/components/projects/NewProjectDialog.tsx` — sugestão de jobs por template
- `src/lib/ops-api.ts` — `createProjectWithTemplates`
- `src/integrations/supabase/types.ts` — após migração

### Fora de escopo neste ciclo
- Drag-and-drop avançado
- Edição inline dos templates dentro do cliente (continua em Configurações)
- Calendário/Arquivos completos (manter placeholders se já não existirem)
