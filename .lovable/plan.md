## Objetivo
Fazer o CRM mostrar, direto no card do lead, o próximo follow-up pendente e o responsável — e garantir que esse responsável seja notificado quando a tarefa chegar (ou atrasar).

## O que muda na tela do CRM (`CrmBoard` + card do lead)

Hoje o card só mostra um badge com a contagem de tarefas vencidas. Vamos enriquecer:

1. **Próximo follow-up no card**
   - Buscar, por lead, a tarefa `pending` mais próxima (menor `due_date`).
   - Exibir no card uma linha compacta com:
     - ícone do tipo (ligação, whatsapp, e-mail, reunião…)
     - título curto da tarefa
     - data relativa ("hoje", "amanhã", "em 3 dias", "atrasada há 2 dias") com cor:
       - vermelho = atrasada
       - âmbar = hoje
       - normal = futuro
   - Clique na linha abre o `LeadSheet` já na aba de tarefas.

2. **Responsável no card**
   - Mostrar avatar + nome curto do `assigned_to` da próxima tarefa (fallback: `owner_id` do lead).
   - Tooltip com nome completo.

3. **Filtro no topo do board**
   - Toggle "Meus leads" (owner_id = usuário atual) e "Minhas tarefas hoje" (leads onde há tarefa minha vencendo hoje/atrasada).

4. **Painel lateral "Follow-ups de hoje"** (opcional dentro desta fase, mesmo componente da tela CRM)
   - Lista agrupada por: Atrasadas / Hoje / Amanhã, com botão "Concluir" e "Reagendar +1 dia".

## Como o responsável é notificado

Já existe:
- `lead_tasks.assigned_to`
- rota `/api/public/hooks/lead-task-reminders` que insere em `notificacoes` para tarefas vencidas/hoje
- `useRealtimeNotifications` que faz popup + som no cliente

Falta o agendamento e alguns gatilhos extras:

1. **Cron diário (pg_cron + pg_net)**
   - Job `lead-task-daily-reminders` às 08:00 (horário do servidor) chamando o endpoint existente com `apikey` = anon key. Uma execução por dia gera os avisos de "tarefa para hoje" e "atrasada".

2. **Cron de manhã cedo para o próximo dia** (opcional, mesmo endpoint com parâmetro)
   - Segundo `cron.schedule` às 18:00 enviando "amanhã você tem X follow-ups", reutilizando o mesmo handler com querystring `?scope=tomorrow`. Se preferir simplificar, ficamos só com o das 08:00.

3. **Notificação instantânea ao criar/atribuir tarefa**
   - Trigger `AFTER INSERT OR UPDATE OF assigned_to ON lead_tasks`:
     - Se `assigned_to` mudou e não é o próprio usuário logado, insere em `notificacoes` (`tipo = 'lead_task'`, link `/crm?leadId=…`) para o novo responsável: "Nova tarefa atribuída a você — {título} · {lead}".
   - Não dispara para tarefas `auto_generated` sem responsável definido.

4. **Notificação ao mover o lead de etapa**
   - O trigger `fn_lead_auto_followup` já cria a tarefa automática ao trocar `stage_id`. Vamos estender para também notificar o `assigned_to` daquela tarefa recém-criada ("Follow-up agendado para {data} · {lead}").

5. **Deduplicação**
   - Mantemos o filtro atual no endpoint (chave `user_id::mensagem` do dia) para não spammar.

## Dados/consultas

- Nova função em `src/lib/lead-tasks-api.ts`: `fetchNextTasksByLead()` → devolve `Map<lead_id, { id, title, type, due_date, assigned_to }>` (uma query, `distinct on (lead_id)` ordenada por `due_date asc`).
- Reaproveitar `fetchOpenTaskCounts` para o badge.
- Um único hook `useLeadTasksSummary` no `CrmBoard` alimenta os cards.

## Arquivos afetados

- `src/components/crm/CrmBoard.tsx` — filtros novos, passar summary aos cards.
- `src/components/crm/LeadCard` (dentro de `CrmBoard.tsx` ou extraído) — linha do próximo follow-up + avatar do responsável.
- `src/lib/lead-tasks-api.ts` — `fetchNextTasksByLead`, tipos auxiliares.
- `supabase/migrations/*` — trigger de notificação em atribuição de tarefa; extensão do `fn_lead_auto_followup`; `cron.schedule` chamando o endpoint.
- Nenhum arquivo novo de rota é necessário (endpoint de lembrete já existe).

## Fora do escopo
- Envio por e-mail/WhatsApp (só notificação in-app + som, que já é o padrão do sistema).
- Reordenação/kanban do painel "hoje" — só listagem simples com concluir/reagendar.
