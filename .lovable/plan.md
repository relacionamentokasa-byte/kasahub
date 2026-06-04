# KASA OS — Plano de construção por fases

O KASA OS é um ERP completo para agências (CRM, Propostas, Clientes, Projetos, Jobs, Financeiro, Portal do Cliente, Dashboards, Aprovações, Calendário, PWA). É inviável entregar tudo funcional num único turno. Vou entregar em **8 fases**, cada fase é uma mensagem/aprovação sua. Você pode reordenar, pular ou pausar a qualquer momento.

Stack: TanStack Start + React + Tailwind v4 + shadcn + Lovable Cloud (Supabase) para auth/banco/storage quando entrarmos em dados reais.

---

## Fase 1 — Identidade + Shell (esta fase, após você escolher a direção visual)

- Sistema de design Kasa em `src/styles.css`:
  - Primária `#FFBC45`, secundária `#0C1618` em `oklch`
  - Funnel Display (headings) + Onest (body) via Google Fonts
  - Tokens semânticos: surfaces, accents, gradients, shadows, radii
  - Variantes customizadas dos componentes shadcn (button hero, card premium, etc.)
- Layout principal autenticado:
  - Sidebar colapsável com navegação para todos os módulos
  - Topbar (busca global, notificações, avatar, switch agência/cliente)
  - Área de pattern gráfico institucional (placeholder até você anexar o oficial)
- Rotas stub para cada módulo com estado vazio elegante (empty states bonitos, não "404")
- Tela de login mockada (visual) — auth real entra na Fase 2

**Entrega:** Você consegue navegar por todo o sistema, ver a identidade aplicada, entender a hierarquia.

## Fase 2 — Lovable Cloud + Autenticação

- Ativar Lovable Cloud
- Auth com email/senha + tabela `profiles` (nome, avatar, role, agência)
- Tabela `user_roles` separada (admin, gestor, operador, cliente) seguindo a regra de segurança
- Rotas protegidas (`_authenticated`) e portal cliente separado (`_client`)
- Onboarding mínimo (criar conta → primeiro acesso)

## Fase 3 — CRM + Propostas

- CRM kanban com drag-and-drop (colunas configuráveis, cards com responsável/valor/origem)
- Histórico, comentários, atividades, anexos por lead
- Ao mover para **Fechado**: trigger que oferece gerar proposta + cliente + projeto + estrutura financeira
- Construtor de propostas com templates, destaque **Investimento Mensal**, geração PDF
- Envio por e-mail (Resend) e link compartilhável; assinatura digital simples (aceite + IP/timestamp); WhatsApp via link
- Tabelas: `leads`, `lead_stages`, `lead_activities`, `proposals`, `proposal_items`

## Fase 4 — Clientes 360° + Projetos + Jobs

- Cadastro de clientes com branding (logo, cores, banner) — base para o portal
- Visão Cliente 360°: abas Visão Geral, Projetos, Jobs, Propostas, Financeiro, Calendário, Arquivos, Timeline
- Projetos com briefing, equipe, prazos, progresso automático calculado pelos Jobs
- Jobs em Kanban com etiquetas personalizáveis (Planejamento, Criação, Copy, Design, Aprovação, Publicação, Tráfego)
- Comentários, anexos, checklist, menções `@nome` com notificações
- Tabelas: `clients`, `client_branding`, `projects`, `jobs`, `job_labels`, `job_comments`, `job_attachments`, `mentions`

## Fase 5 — Financeiro + Indicadores

- Contas bancárias (saldo por conta + consolidado)
- Contratos mensais recorrentes, jobs avulsos, parcelamentos
- Contas a pagar / a receber, fluxo de caixa, conciliação manual
- Cálculo automático: Ticket Médio Recorrente, Ticket Médio Geral, Receita Extra, MRR, ARR
- Vencimentos disparam notificações
- Tabelas: `bank_accounts`, `contracts`, `transactions`, `installments`, `financial_categories`

## Fase 6 — Dashboards (Executiva + CEO) + Relatórios

- Dashboard Executiva: faturamento mensal/anual, lucro, despesas, tickets, clientes ativos, meta x realizado, gráficos (Recharts)
- Dashboard CEO restrita por role: MRR, ARR, lucro líquido, fluxo de caixa, rentabilidade, top clientes
- Relatórios financeiros/comerciais/operacionais/por cliente com exportação (CSV + PDF)

## Fase 7 — Portal do Cliente + Aprovações + Calendário

- Portal `/portal/:cliente-slug` com branding personalizado (Kasa × Cliente)
- Dashboard do cliente: próximas entregas, aprovações pendentes, calendário, projetos ativos, timeline, equipe
- **Aprovações estilo Instagram**: feed em grid, modal com versionamento, aprovar / pedir ajuste / comentar / baixar
- Calendário interno integrado com Jobs, Projetos, Reuniões, Aprovações
- Sincronização bidirecional com Google Calendar (conector OAuth do Lovable)

## Fase 8 — Notificações + PWA + Polimento final

- Notificações internas (centro de notificações + toasts), e-mail (Resend), push (web push)
- Eventos: menções, aprovações, novos jobs, propostas assinadas, vencimentos
- PWA instalável: manifest, ícones Kasa, splash, push notifications (service worker de mensageria)
- Auditoria visual final, microinterações (Motion), revisão de acessibilidade e responsividade

---

## O que acontece agora

1. Você aprova este plano (ou pede ajustes).
2. Eu gero **3 direções visuais** (HTML renderizado) aplicando a identidade Kasa — você escolhe uma.
3. Construo a **Fase 1** com a direção escolhida.
4. Você anexa o pattern oficial quando puder — eu substituo o placeholder.

Cada fase seguinte só começa quando você der o ok da anterior.