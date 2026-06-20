# Construtor de Relatórios

Ferramenta interna para a equipe montar relatórios de cliente partindo de **templates prontos**, em vez de abrir PPTX do zero. Conteúdo (texto + imagens) é **preenchido manualmente** — nada vem do banco automaticamente nesta v1.

## Fluxo da equipe

1. Em `Relatórios → Construtor`, clica em **"Novo relatório"**.
2. Escolhe o **cliente** + um **template** (ex.: Mensal de Performance, Sprint, Apresentação de Onboarding, Em branco).
3. Cai no **editor**: lista de slides à esquerda, slide selecionado no centro, painel de propriedades do bloco à direita.
4. Edita textos inline, troca imagens (upload), duplica/reordena/remove slides, adiciona novos a partir da paleta de blocos.
5. Botões no topo: **Apresentar** (fullscreen 1920×1080) · **Exportar PDF** (A4 paisagem) · **Salvar** (autosave).

## Blocos disponíveis (MVP)

Capa · Título de seção · Texto livre (com **markdown** simples: negrito, itálico, listas) · Imagem (1 destaque) · Galeria (até 4 imagens em grid) · KPI cards (até 4, número + label + variação opcional — preenchidos à mão) · Lista de entregas (checklist) · Comparativo "antes/depois" (2 colunas) · Próximos passos · Fechamento.

Todos os blocos respeitam a identidade visual: tipografia **Funnel Display** (títulos) + **Onest** (corpo), cores primárias do cliente (a partir de `clients.brand_color` quando existir, senão cores Kasa).

## Templates iniciais

- **Relatório Mensal** — Capa · Resumo · KPIs · Entregas do mês · Comparativo · Próximos passos · Fechamento.
- **Relatório de Sprint** — Capa · Objetivo da sprint · Entregas · Aprendizados · Próximos passos.
- **Em branco** — só a capa, equipe monta do zero.

Templates ficam editáveis em `Config → Templates de Relatório` (próximo passo, fora do MVP).

## Modo Apresentar

Mesma arquitetura do `onboarding.$onboardingId.apresentar`: renderização 1920×1080 com `transform: scale()`, fundo escuro, navegação por setas/espaço/ESC, contador de slides no canto. Sem "Powered by", sem logo da agência no rodapé final (mesma decisão do onboarding).

## Exportação PDF

`/relatorios/$id/pdf` → rota dedicada que renderiza todos os slides empilhados, com CSS `@page { size: 1920px 1080px landscape; margin: 0 }` e `page-break-after: always`. Usuário usa **Cmd/Ctrl + P → Salvar como PDF**. Sem dependência de libs pesadas no servidor, render fiel ao Apresentar.

## Detalhes técnicos

**Banco (1 migration):**
- `report_templates` — `id, name, description, slides (jsonb), is_default, created_at, updated_at`. RLS: leitura para `authenticated`, escrita apenas para admin (via `has_role`).
- `reports` — `id, client_id (fk clients), template_id (fk report_templates, nullable), title, status ('rascunho' | 'finalizado'), slides (jsonb — array de `{id, type, props}`), created_by (uuid), created_at, updated_at`. RLS: usuários autenticados leem/escrevem (mesmo padrão dos outros recursos internos).
- GRANTs nas duas tabelas para `authenticated` e `service_role`.
- Seed dos 2 templates padrão direto na migration.

**Bucket de imagens:** `report-images` (público), com policy de upload para `authenticated`.

**Frontend (TanStack Start):**
- `src/routes/_authenticated/relatorios.construtor.index.tsx` — lista de relatórios + botão "Novo".
- `src/routes/_authenticated/relatorios.construtor.$reportId.tsx` — editor (sidebar de slides + canvas + painel de bloco).
- `src/routes/_authenticated/relatorios.construtor.$reportId.apresentar.tsx` — modo fullscreen.
- `src/routes/_authenticated/relatorios.construtor.$reportId.pdf.tsx` — render para impressão.
- `src/components/reports/blocks/*` — um componente por tipo de bloco, com modo `edit` (inputs inline) e modo `view` (apresentação/PDF).
- `src/lib/reports-api.ts` — CRUD via Supabase client (`from('reports')`).
- Link no `AppSidebar.tsx` em "Gestão → Construtor de Relatórios".

**Autosave:** debounce de 800ms em qualquer alteração de slides; indicador "Salvo · agora" no topo.

## Fora do escopo desta v1

- Dados automáticos de jobs/financeiro (deixamos gancho no schema mas não conectamos).
- Compartilhamento por link público com o cliente.
- Versionamento de relatório.
- Comentários da equipe dentro do relatório.

Posso seguir e começar pela migration?
