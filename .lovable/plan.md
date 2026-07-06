# Estruturando o CRM: funil visual + melhorias para a equipe

## 1. Nova visualização "Funil" no CRM

Hoje o CRM tem apenas o board Kanban. Vou adicionar uma **segunda aba** ao lado do funil comercial, com um toggle no topo:

```
[ Kanban ] [ Funil ]   (mesma página /crm)
```

### Como o funil vai parecer

Formato de funil real (trapézios empilhados), cada faixa representa uma etapa da `lead_stages`, com largura proporcional à quantidade de leads e cor da etapa. Dentro de cada faixa:

- Nome da etapa + contagem de leads + valor total (R$)
- Taxa de conversão para a próxima etapa (%)
- Ao clicar na faixa → abre um painel lateral listando **quais leads estão ali**, com foto/nome/empresa/valor. Clicar num lead abre o `LeadSheet` já existente.

Ao lado do funil, um resumo:
- Total de leads no funil
- Valor total em pipeline
- Ticket médio
- Taxa de conversão geral (primeira etapa → etapa "ganha")
- Tempo médio por etapa (dias que o lead ficou parado)

```text
   ┌─────────────────────────────┐  Novo lead      42  R$ 210k
   └───┐                     ┌───┘  ↓ 71%
       │  Qualificado    30  │      R$ 180k
       └──┐               ┌──┘      ↓ 60%
          │ Proposta   18 │         R$ 145k
          └─┐           ┌─┘         ↓ 44%
            │ Ganho   8 │           R$ 80k
            └───────────┘
```

## 2. Melhorias sugeridas para a equipe usar o CRM

Marquei o que eu recomendo incluir já nesta rodada com **[incluir]**. O resto fica para você escolher o que quer priorizar depois.

**Visão e produtividade**
- **[incluir]** Toggle Kanban ⇄ Funil (item 1 acima)
- **[incluir]** Card do lead mostrando **dias parado na etapa** (com cor: verde <7d, amarelo 7–15d, vermelho >15d) — evita lead esquecido
- **[incluir]** Filtro por responsável e por origem no topo do board/funil
- **[incluir]** KPIs no topo da página: leads no mês, taxa de conversão, ticket médio, valor ganho no mês

**Ação e follow-up**
- Tarefas / follow-ups com data no lead (aparecem no dashboard "Meu Dia")
- Templates de mensagem de WhatsApp editáveis nas configurações (hoje estão fixos no código)
- Lembretes automáticos quando um lead fica X dias parado (notificação para o responsável)

**Análise**
- Relatório de motivos de perda (campo "motivo" ao mover para etapa perdida + gráfico)
- Evolução mensal de leads criados x ganhos (gráfico de linha)
- Ranking de vendedores (leads convertidos, valor fechado)

**Colaboração e qualidade de dados**
- Atribuir responsável ao lead (owner visível no card)
- Deduplicação: aviso ao criar lead com e-mail ou telefone já existentes
- Importação em massa via CSV
- Histórico de mudança de etapa (já existe `lead_activities`, expor um timeline visual no `LeadSheet`)

## 3. O que faço agora

Nesta implementação vou entregar apenas os itens marcados **[incluir]**:

1. Aba "Funil" no `/crm` com visualização de funil clicável
2. Indicador de dias parado nos cards do Kanban
3. Filtro por responsável e origem no topo
4. Barra de KPIs no topo da página

Os demais itens da lista ficam como próximas rodadas — me diga quais quer priorizar em seguida.

## Detalhes técnicos

- Novo componente `src/components/crm/CrmFunnel.tsx` (SVG com trapézios; reusa `fetchStages` e `fetchLeads` do `crm-api.ts`)
- `CrmBoard.tsx` vira wrapper com toggle e passa a chamar `<CrmKanban>` (renomeando o conteúdo atual) ou `<CrmFunnel>`
- Barra de KPIs e filtros extraídos para `src/components/crm/CrmHeader.tsx` para serem compartilhados
- Cálculo de "dias parado" a partir de `updated_at` do lead (já existe na tabela `leads`); se preferir precisão real por etapa, adicionamos depois um campo `stage_changed_at` via migration
- Nenhuma alteração de schema nesta rodada
