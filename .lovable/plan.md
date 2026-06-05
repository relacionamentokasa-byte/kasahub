## Estado atual (já implementado em iterações anteriores)
- Aprovar proposta já gera Cliente, Projeto, Jobs (por template) e lançamentos financeiros com status `pending`.
- Visão 360 do Cliente já lista propostas/projetos/jobs/financeiro.
- Editor já tem `responsible_id`, `payment_kind`, `auto_create_jobs`, conta/categoria default.

## Lacunas que serão atacadas neste ciclo

### 1. Migração de banco
- `proposals`: adicionar `contract_type` (text: `recurring | one_time | project | consulting | implementation`), `commercial_id` (uuid), `operational_id` (uuid), `service_type` (text), `target_kind` (text: `lead | client`). Campos `lead_id` e `client_id` já existem.
- `proposal_items`: adicionar `deliverables` (jsonb array de strings).
- Nova tabela `proposal_events` (id, proposal_id, type, actor_id, payload jsonb, created_at) + RLS team-only + GRANTs.

### 2. Dialog "Nova proposta" (`propostas.tsx`)
- Campos: Título, **Destino da proposta** (toggle: Lead | Cliente), seletor correspondente (Lead OU Cliente), Tipo de Serviço, Validade.
- Se Lead: pré-preenche nome/e-mail a partir do lead; mantém `lead_id`, deixa `client_id` nulo.
- Se Cliente: pré-preenche pelo cliente; mantém `client_id`, `lead_id` nulo.
- Auto-cria proposta e abre o editor.

### 3. Editor (`propostas.$proposalId.tsx`)
- Cabeçalho: mostra vínculo atual (Lead/Cliente) com possibilidade de trocar.
- Bloco "Condições financeiras" reorganizado com **Investimento Mensal** em destaque (card grande primary).
- Bloco "Serviços contratados" reformatado: cards com Nome, Descrição, Valor, **Entregáveis** (lista editável) + Job Template.
- Bloco "Responsáveis" com avatar+nome para Comercial e Operacional.
- Select "Tipo de contrato" com 5 opções.
- Seção "Timeline" exibindo `proposal_events` em ordem cronológica.
- Helper `recordProposalEvent()` chamado em criação/edição/envio/aprovação/cancelamento.

### 4. PDF / página pública (`/p/$token` e `?print=1`)
- Logo Kasa (de `agency_settings.logo_url`) e faixa com pattern `src/assets/kasa-pattern.jpeg`.
- Bloco destacado de Investimento Mensal.
- Serviços com entregáveis em bullets.
- Datas de vencimento das parcelas.
- Áreas de assinatura: cliente (preenchida quando `accepted_name`) e Kasa.

### 5. Aprovação
- Mantém criação automática de Cliente/Projeto/Jobs/Financeiro pendente.
- Se a proposta era de Lead, a aprovação converte o lead em cliente (já é o comportamento via `approveProposal`).
- Registra evento `approved` na timeline.

### 6. Visão 360
- Aba de propostas com badges Enviada/Aprovada/Cancelada/Reaberta.

## Detalhes técnicos
- Arquivos novos: `src/components/proposals/ProposalServiceCard.tsx`, `src/components/proposals/ProposalTimeline.tsx`, `src/lib/proposal-events.ts`, migração SQL.
- Arquivos editados: `src/routes/_authenticated/propostas.tsx`, `src/routes/_authenticated/propostas.$proposalId.tsx`, `src/routes/p.$token.tsx`, `src/lib/proposal-approval.ts`, `src/lib/crm-api.ts`.

## Pergunta antes de executar
Posso seguir com o pacote completo em uma entrega, ou prefere fatiar?
1. Migração + Dialog Nova Proposta (Lead/Cliente) + campos novos do editor (entregáveis, responsáveis duplos, tipo de contrato, investimento mensal em destaque).
2. Timeline (`proposal_events`) + integração na aprovação.
3. PDF institucional com logo/pattern/assinaturas.
