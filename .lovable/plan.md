## Escopo

Implementar 8 melhorias de UX agrupadas em 3 frentes:

### 🏠 Kasa Hub (interno)
1. **Timeline unificada em Jobs e Propostas** — painel lateral mostrando todo histórico (status, comentários, aprovações, checklist)
2. **Dashboard "Meu Dia"** — nova seção no dashboard com cards personalizados ("Você tem X jobs, Y aprovações, Z propostas esperando você")
3. **Modo Focado sugerido** — ao abrir um Job no JobSheet, sugerir entrar em modo foco (toast com botão)
4. **Avatar do responsável + "bola da vez"** nos cards de Jobs do board

### 👤 Portal do Cliente
5. **Tour de onboarding** — primeira visita mostra 3 passos (projetos / aprovações / lançamento)
6. **Linguagem amigável** — Job→Demanda, Stage→Etapa, DME→Solicitação de Pagamento
7. **"Quem cuida de você"** — card no topo com foto/nome/WhatsApp do gerente de conta
8. **Auditoria mobile** — garantir que aprovação, comentário e PDF funcionem bem no celular

## Implementação

### 1. Timeline unificada (Jobs + Propostas)
- Novo componente `src/components/timeline/UnifiedTimeline.tsx` que agrega:
  - Jobs: `job_history` + `job_comments` + `job_checklist` + `job_approval_logs`
  - Propostas: `proposal_events` + comentários + assinaturas
- Aba "Atividade" no `JobSheet` e `ProposalDetailSheet` (já existe `ProposalTimeline` — estender)
- Ícones por tipo de evento, autor, timestamp relativo, agrupamento por dia

### 2. Dashboard "Meu Dia"
- Nova seção no topo de `src/routes/_authenticated/dashboard.tsx` (acima do executivo)
- 4 cards clicáveis filtrados por `auth.uid()`:
  - Jobs em execução comigo
  - Aprovações esperando minha resposta
  - Propostas com minha ação pendente
  - Tarefas do checklist onde sou o próximo
- Cada card navega filtrado pra módulo correspondente

### 3. Modo focado sugerido
- No `JobSheet`, ao abrir um job com status `in_progress` atribuído ao usuário atual, mostrar toast "Quer entrar em modo foco para executar?"
- Botão "Entrar em modo foco" no header do JobSheet (sempre visível)
- Persistir preferência "não sugerir novamente" em `localStorage`

### 4. Avatar + "bola da vez" em cards de Jobs
- No `JobsBoard`, cada card mostra:
  - Avatar do `assigned_to` no canto
  - Pulso/destaque (ring animado) quando é a vez dele agir (próximo item de checklist incompleto)
  - Tooltip "Bola da vez: Amanda"

### 5. Tour de onboarding do portal
- Componente `src/components/portal/PortalTour.tsx` com 3 passos via overlay
- Trigger: primeira visita (flag em `localStorage` por client_id)
- Botão "Pular tour" + "Próximo"
- Destaca áreas com spotlight

### 6. Linguagem amigável no portal
- Criar `src/lib/portal-glossary.ts` com map { job: "Demanda", stage: "Etapa", dme: "Solicitação de Pagamento", ... }
- Função `t(key)` aplicada em todos os componentes em `src/components/portal/` e `src/routes/_authenticated/portal.tsx`
- Não muda nomes nas tabelas, só a apresentação

### 7. "Quem cuida de você"
- Card no topo do `ClientPortalStructure` com:
  - Avatar + nome do `account_manager_id` (campo já existe em `clients`?) — verificar
  - Se não existir, usar o usuário com role `account_manager` mais ativo no projeto
  - Botão WhatsApp (link `wa.me/<phone>`)
  - Botão "Enviar mensagem" (futuro)

### 8. Auditoria mobile
- Revisar `ApprovalSheet`, comentários no portal, e visualização de PDF
- Aplicar `responsive-layout-patterns`: grid + min-w-0 + shrink-0
- Botões de aprovar/recusar grandes e fixos no bottom em mobile
- PDF viewer com `object-contain` e zoom touch

## Arquivos novos
- `src/components/timeline/UnifiedTimeline.tsx`
- `src/components/dashboard/MyDaySection.tsx`
- `src/components/portal/PortalTour.tsx`
- `src/components/portal/AccountManagerCard.tsx`
- `src/lib/portal-glossary.ts`
- `src/lib/timeline-api.ts` (agrega eventos)

## Arquivos editados
- `src/components/jobs/JobSheet.tsx` — aba Atividade + sugestão de foco
- `src/components/jobs/JobsBoard.tsx` — avatar + bola da vez
- `src/components/proposals/ProposalDetailSheet.tsx` — usar UnifiedTimeline
- `src/routes/_authenticated/dashboard.tsx` — MyDaySection
- `src/components/portal/ClientPortalStructure.tsx` — tour + AccountManagerCard + glossário
- `src/components/approvals/ApprovalSheet.tsx` — mobile-first

## Detalhes técnicos
- Timeline: query única que faz `union all` em server function pra performance
- "Bola da vez" derivado do próximo item de `job_checklist` não concluído
- Tour usa portal + overlay com `position: fixed` e spotlight via box-shadow
- WhatsApp link: `https://wa.me/${phone.replace(/\D/g, "")}`
- Glossário: hook `usePortalLabel(key)` com fallback pro termo original

## Ordem de execução
1. Glossário + AccountManagerCard + Tour (portal — mais autônomo)
2. MyDaySection (dashboard)
3. UnifiedTimeline (Jobs + Propostas)
4. Avatar/bola da vez + modo foco sugerido (Jobs)
5. Auditoria mobile (revisão visual + ajustes)

Cada frente é independente — posso executar em paralelo onde possível.