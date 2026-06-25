
# Plano: Calendário Editorial + Roteiros

Dois módulos novos no Kasa Hub, reaproveitando clientes, jobs, portal e permissões existentes.

## 1. Banco de dados (uma migração)

**Tabela `editorial_posts`**
- client_id (fk clients), title, scheduled_at (timestamptz), social_network (enum: instagram/youtube/tiktok/linkedin/facebook/other), content_type (enum: reels/static/carousel), description, status (enum: planned/in_production/review/approved), job_id (fk jobs, nullable), created_by, created_at, updated_at
- RLS: team (is_team_member) full CRUD; portal user do client só SELECT + UPDATE apenas no campo status para "approved"
- Trigger: quando `jobs.stage_id` muda e existe editorial_post com job_id = NEW.id, mapear stage → status do post (usando uma coluna `editorial_status_map` em job_stages OR heurística por nome). Vou usar campo `editorial_status` em job_stages (enum opcional).

**Tabela `scripts` (roteiros)**
- job_id (fk jobs UNIQUE, not null), client_id (fk clients, derivado), title, content_type (enum: reels/youtube/story/live/event/institutional/other), platform (enum igual ao do post), estimated_duration_sec int, video_format (enum: vertical/horizontal/square), status (enum: draft/review/approved), created_by, timestamps
- Trigger BEFORE INSERT/UPDATE: setar client_id = jobs.client_id
- RLS: team CRUD; portal user só SELECT quando status=approved e job pertence ao cliente

**Tabela `script_scenes`**
- script_id (fk scripts on delete cascade), scene_number int, visual text, speech text, duration_sec int, production_notes text, timestamps
- RLS espelha scripts via has script access

GRANTs em todas para authenticated + service_role.

## 2. Backend / API

`src/lib/editorial-api.ts` — listEditorialPosts({clientId, from, to, filters}), createPost, updatePost, deletePost, movePost(id, newDate), convertPostToJob(postId, stageId), approveMonth(clientId, month), approvePost(id).

`src/lib/scripts-api.ts` — listScripts({filters}), getScript(id), createScript, updateScript, deleteScript, addScene, updateScene, deleteScene, reorderScenes(scriptIds[]), setStatus.

Server route público para portal: o portal já usa `/api/public/portal-action.$slug` — adicionar ações `approve_editorial_month` e `approve_editorial_post`.

## 3. UI - Calendário Editorial

Rota: `src/routes/_authenticated/calendario-editorial.tsx`
- Header com seletor de cliente (obrigatório), filtros (rede, tipo, status, mês), toggle Mensal/Semanal, botão "Novo post"
- `EditorialMonthGrid.tsx` — grade mensal com cards (cor por rede social, badge de status); dnd-kit para mover entre dias
- `EditorialWeekList.tsx` — lista detalhada
- `EditorialPostDialog.tsx` — criar/editar com todos os campos + botão "Converter em Job" (cria job via createJob existente, vincula job_id no post)
- Link "Abrir Job" quando vinculado
- Sidebar entry em `AppSidebar.tsx`

## 4. UI - Roteiros

Rota: `src/routes/_authenticated/roteiros.tsx` (lista com filtros)
Rota: `src/routes/_authenticated/roteiros.$scriptId.tsx` (edição)
- `ScriptList.tsx` — cards filtráveis
- `ScriptEditor.tsx` — 2 colunas: campos gerais à esquerda, lista de cenas à direita
- `ScenesEditor.tsx` — dnd-kit reordenar, adicionar/remover, contador total automático
- `ScriptReadView.tsx` — modo leitura para aprovação
- Em `JobSheet.tsx`: nova aba/seção "Roteiro" mostrando o roteiro vinculado (se existir) + botão criar; quando aprovado aparece em "Entregáveis"

## 5. Portal do cliente

Em `src/routes/minha-kasa.$slug.tsx` / `ClientPortalStructure.tsx`:
- Nova aba "Calendário" com `PortalEditorialCalendar.tsx` (mensal, read-only)
- Botões "Aprovar mês" (move todos in_production|review → approved) e "Aprovar post"
- Posts aprovados ficam bloqueados (somente visualização)
- Listar roteiros aprovados vinculados aos jobs do cliente em "Entregáveis"

## 6. Sincronização status Job → Post

Trigger plpgsql em `jobs` AFTER UPDATE OF stage_id: lookup do mapeamento via novo campo `job_stages.editorial_status` (enum nullable). Quando definido e o job tem post vinculado, atualiza `editorial_posts.status`.

Painel admin: por enquanto a agência mapeia editando os stages (campo já gerenciável em config); seed default sugerido para stages comuns.

## Critérios de aceitação cobertos
Todos os listados no prompt — CRUD posts/roteiros, visões mensal/semanal, drag&drop, conversão post→job, sincronização status, aprovação portal mês/post, herança cliente do job, reorder cenas, roteiro como entregável, eventos como roteiro tipo "event".

## Escopo fora desta entrega
- Notificações específicas (reaproveita stack atual)
- Mobile específico (responsivo desktop+tablet conforme pedido)
- Publicação automática nas redes (não pedido)

Confirma que posso seguir com a migração e implementação completa?
