# Sistema de Captação de Leads

Construção de um motor completo de entrada de leads na Kasa Hub, com webhook genérico, landing pages de alta conversão por fonte, gestão no Config e deduplicação automática.

---

## 1. Banco de Dados (migração)

### Tabela `lead_sources`
Cada "fonte" é um canal de captação (ex: "Google Ads — Branding", "Instagram Bio", "Landing Identidade Visual").

Campos principais:
- `name`, `slug` (único, usado na URL `/captar/{slug}`)
- `secret` (token para validar webhook)
- `is_active`
- `default_stage_id` (estágio padrão no funil — default "Novo")
- `notify_user_ids` (uuid[] — quem recebe notificação)
- **Customização da landing**:
  - `landing_headline`, `landing_subheadline`, `landing_description`
  - `landing_cta_label` (ex: "Quero falar com a Kasa")
  - `landing_logo_url`, `landing_hero_image_url`, `landing_bg_color`, `landing_accent_color`
  - `landing_benefits` (jsonb — lista de bullets/benefícios)
  - `landing_testimonials` (jsonb — depoimentos opcionais)
  - `landing_form_fields` (jsonb — quais campos pedir: name, email, phone, message, company, budget...)
  - `landing_success_message` ou `landing_redirect_url` (pós-envio)
  - `pixel_meta_id`, `gtag_id` (opcional, tracking)
- `created_at`, `updated_at`, `owner_id`

### Tabela `lead_source_submissions` (histórico)
Log bruto de cada submissão recebida (para auditoria/debug), com `source_id`, `payload`, `ip`, `user_agent`, `lead_id` (se virou lead), `status` (created/updated/spam/error), `error_message`.

### Ajustes em `leads`
Adicionar colunas se ainda não existirem: `source_id` (fk lead_sources), `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referrer_url`, `landing_page_url`.

### Função de deduplicação
`fn_upsert_lead_from_source(...)` — security definer, normaliza email/telefone, faz match e cria ou atualiza o lead, registra timeline event, dispara notificação para `notify_user_ids` (via `notificacoes`).

### RLS
- `lead_sources`: admin/gestor gerenciam; leitura pública apenas via server (não anon direto).
- `lead_source_submissions`: visível pra time interno.

---

## 2. Server Routes (HTTP públicos)

### `POST /api/public/leads/inbound`
Webhook genérico. Aceita query `?source={slug}&secret={token}` OU header `x-kasa-secret`. Valida secret, normaliza payload flexível (mapeia `name|nome|full_name`, `email`, `phone|telefone|whatsapp`, `message|mensagem`, utm_*), chama `fn_upsert_lead_from_source`, retorna `{ ok, lead_id, status }`.

### `GET /api/public/leads/source/:slug`
Devolve config pública da landing (sem secret) — usada pelo formulário hospedado para se auto-renderizar.

### `POST /api/public/leads/submit/:slug`
Endpoint do formulário hospedado. Mesma lógica do inbound mas sem exigir secret (slug + rate limit por IP). Aceita campos do form + utms via querystring.

Todos usam `supabaseAdmin` carregado dentro do handler. Validação com Zod. Rate limit simples por IP+slug em memória (best effort).

---

## 3. Landing Page Pública `/captar/$slug`

Rota TanStack pública (não-`_authenticated`), SSR ligado para SEO/OG.

- Loader: fetch da config da fonte via server fn público (publishable client, RLS `to anon` SELECT scoped a `is_active=true`).
- Layout de **alta conversão**:
  - Hero com headline + subheadline + CTA scroll
  - Imagem/logo da fonte
  - Bloco de benefícios (3-5 bullets com ícone)
  - Formulário visível e curto (campos configurados)
  - Prova social (depoimentos opcionais)
  - Footer minimalista Kasa
- Estilo: usa design tokens da Kasa (`--primary`, `--background`), tipografia display, animações sutis
- Pixel Meta + Google Tag injetados no `head()` quando configurados
- Pós-envio: tela de sucesso ou redirect (WhatsApp, página de obrigado)
- 404 amigável se slug não existe ou inativo

---

## 4. UI Interna — "Fontes de Lead" no Config

Nova aba em `/config` (ou nova rota `/config/lead-sources`):

- **Lista de fontes** (cards): nome, slug, status, total de leads, último recebido
- **Criar/editar fonte** (drawer/modal):
  - Aba "Geral": nome, slug, ativo, responsáveis pra notificação, estágio padrão
  - Aba "Landing": editor visual com preview ao vivo — headline, sub, descrição, CTA, cores, logo, hero image, benefícios (lista editável), depoimentos (lista editável), campos do form (checkboxes)
  - Aba "Integração": URL do webhook + secret (copiar), URL pública da landing (copiar + abrir), Pixel Meta ID, Google Tag ID, mensagem/redirect pós-envio
  - Aba "Histórico": últimas N submissões com payload bruto, status, link pro lead criado
- Botão "Regenerar secret"
- Botão "Testar webhook" (dispara payload de exemplo)

Implementação: server fns autenticadas (`requireSupabaseAuth`) — `listLeadSources`, `getLeadSource`, `upsertLeadSource`, `regenerateSecret`, `listSubmissions`, `sendTestPayload`.

---

## 5. CRM — Integração

- Leads criados via fonte aparecem no estágio "Novo" (ou `default_stage_id` da fonte)
- Card do lead mostra badge da fonte + UTMs + link pra landing usada
- Timeline do lead/cliente registra evento `lead_captured` com metadados

---

## 6. Notificações

Trigger ao criar lead via fonte:
- Insere em `notificacoes` para cada usuário em `notify_user_ids` da fonte
- Título: "🎯 Novo lead — {nome da fonte}"
- Mensagem: "{nome do lead} acabou de se cadastrar via {fonte}"
- Link: `/crm?leadId={id}`
- Push notification dispara automático (trigger `fn_dispatch_push_on_notification` já existente)

---

## Detalhes Técnicos

- Migração única com 2 tabelas + colunas em `leads` + função `fn_upsert_lead_from_source` + RLS + GRANTs (incluindo `GRANT SELECT ON lead_sources TO anon` apenas para colunas públicas via policy `is_active=true`)
- Server fns em `src/lib/leadSources.functions.ts`
- Server routes em `src/routes/api/public/leads/`
- Landing em `src/routes/captar.$slug.tsx`
- UI Config em `src/components/config/LeadSourcesPanel.tsx` + sub-componentes (editor, preview, histórico)
- Validação Zod em todas as bordas
- Para URLs: `https://kasahub.lovable.app/captar/{slug}` e webhook `https://kasahub.lovable.app/api/public/leads/inbound?source={slug}&secret={token}`

---

## Ordem de implementação

1. Migração (DB + função + RLS + GRANTs)
2. Server routes públicos (webhook + submit + get-config)
3. Server fns autenticadas (CRUD de fontes)
4. Landing page `/captar/$slug`
5. UI Config "Fontes de Lead"
6. Integração CRM (badge + filtro por fonte)

Depois de aprovado, executo tudo em sequência. Pronto pra começar?
