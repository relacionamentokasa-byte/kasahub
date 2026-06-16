# Stories e Carrossel no portal de aprovações

Adicionar dois novos formatos de peça (**Story** e **Carrossel**) no fluxo `approval_items` que alimenta o portal `minha-kasa`, com **comentários ancorados em cada slide** e **aprovação slide-a-slide**.

## 1. Banco (uma migration)

**Novas colunas em `approval_items`:**
- `format text default 'single'` — `single | carousel | story`
- `slides jsonb default '[]'` — array ordenado `[{ id, url, mime_type, thumbnail_url?, duration_ms? }]` (substitui `content_url` quando `format ≠ single`)
- `slide_statuses jsonb default '{}'` — `{ "<slide_id>": "approved" | "rejected" | "pending" }` para aprovação parcial
- Status geral (`status`) continua existindo: vira `approved` quando **todos** slides aprovados, `rejected` se algum rejeitado, senão `pending`.

**Nova tabela `approval_item_comments`:**
- `id`, `approval_item_id` (FK), `slide_id text null` (null = comentário da peça toda; preenchido = ancorado em um slide), `author_type` (`client | team`), `author_name`, `author_id uuid null`, `body text`, `is_change_request bool`, `created_at`.
- GRANTs: `authenticated` (time) + `service_role`. Acesso do cliente acontece via server route com token (mesma lógica do portal hoje).
- RLS: time vê tudo do tenant; insert do cliente vai por rota pública com token.

## 2. Upload (time)

Atualizar `SendForApprovalDialog` (`src/components/jobs/SendForApprovalDialog.tsx`):
- Novo seletor de **Formato** acima do tipo: `Único | Carrossel | Story`.
- Quando Carrossel ou Story: input vira **upload múltiplo** (até 10 imagens / 7 vídeos curtos para story), com lista reorderável (drag) e botão remover por slide.
- Legenda única (já existe) continua aplicável.
- `createApprovalItem` em `src/lib/approval-items-api.ts` ganha `format` e `slides[]`.

## 3. Portal do cliente (`src/routes/minha-kasa.$slug.tsx`)

Dois novos componentes de preview (renderizados quando `format !== 'single'`):

**`CarouselPreview`** — quadrado 1:1, swipe horizontal (touch + setas), bolinhas indicadoras embaixo, contador `1/4` no topo direito. Cada slide tem:
- Badge de status do slide (aprovado / pendente / ajuste)
- Botão "💬 Comentar este slide" → abre input ancorado naquele `slide_id`
- Botões "Aprovar slide" / "Pedir ajuste" individuais

**`StoryPreview`** — vertical 9:16, barras de progresso no topo (estilo Insta), auto-advance 5s (pausável ao segurar), tap esquerda/direita pra navegar. Mesmas ações por slide.

Comentários: lista filtrada por `slide_id` aparece junto do slide ativo. Comentários "da peça toda" (slide_id null) ficam no rodapé.

## 4. Backend público (server route)

Atualizar `src/routes/api/public/portal-approval-action.$slug.ts` pra aceitar:
- `action: "approve_slide" | "reject_slide" | "comment"` com `slide_id` opcional
- Recalcular `status` agregado da peça automaticamente quando todos slides decididos.

## 5. UI auxiliar

Atualizar grid/lista de peças no portal pra mostrar:
- Ícone de formato (🖼️ único, 🎠 carrossel, 📱 story)
- Contador "2/4 slides aprovados" quando aplicável
- Badge "Ajustes pedidos em 1 slide"

## Detalhes técnicos

- Upload de múltiplos arquivos usa o `public-assets` bucket já existente, mesma função do `ImageUpload`.
- Drag-and-drop de reordenação: `@dnd-kit/sortable` (já instalado? verificar — se não, `bun add @dnd-kit/core @dnd-kit/sortable`).
- Story auto-advance via `setInterval` + `requestAnimationFrame` pra barras de progresso suaves.
- Tipos: estender `ApprovalContentType` → manter; adicionar `ApprovalFormat = 'single' | 'carousel' | 'story'`.
- Backwards-compat: peças antigas têm `format = 'single'` e seguem funcionando via `content_url`.

## Ordem de execução

1. Migration (DB)
2. `approval-items-api.ts` + tipos
3. `SendForApprovalDialog` (upload múltiplo + reorder)
4. Server route (`portal-approval-action`)
5. `CarouselPreview` + `StoryPreview` componentes novos
6. Integrar no `minha-kasa.$slug.tsx` (substituir bloco de render quando `format !== 'single'`)
7. Badges/contadores na grid

Posso começar pela migration?
