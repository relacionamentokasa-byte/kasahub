# Plano de Ajuste na Implementação de Suspensão Financeira

Ajustar a lógica de exibição do módulo Financeiro para que lançamentos de clientes com cobrança suspensa sejam omitidos da visão operacional (contas a receber e indicadores ativos), mantendo-os acessíveis apenas no histórico individual do cliente e em relatórios históricos globais.

## Objetivos
- Ocultar transações pendentes/atrasadas de clientes suspensos da listagem principal do Financeiro.
- Excluir valores suspensos dos indicadores operacionais de "A Receber" e "Atrasados".
- Preservar transações pagas nos relatórios e histórico.
- Garantir que não haja alteração nos dados das transações (`status`, `amount`, etc.).
- Manter a visibilidade total na aba Financeiro do próprio cliente, com separação visual clara.

## Etapas de Implementação

### 1. Auditoria e Mapeamento
Identificar todos os pontos de consumo de transações:
- `src/lib/finance-api.ts`: Central de carregamento de dados e cálculo de estatísticas.
- `src/routes/_authenticated/financeiro.tsx`: Listagem principal (visão operacional).
- `src/routes/_authenticated/relatorios.tsx`: Relatórios e indicadores globais.
- `src/components/dashboard/SaudeNegocioSection.tsx`: Dashboards executivos.
- `src/routes/_authenticated/clientes.$clientId.tsx`: Histórico individual.

### 2. Ajustes na API e Lógica de Negócio
- **Filtragem na Listagem Principal:** Modificar a busca ou o processamento de transações no módulo Financeiro para omitir itens `pending` ou `overdue` de clientes com `financial_collection_status === 'suspended'`.
- **Refinamento de Indicadores:** Atualizar as funções de cálculo de totais para que a suspensão financeira remova o peso desses lançamentos do "A Receber" operacional.

### 3. Ajustes na Interface (UI)
- **Financeiro Principal:** Garantir que a listagem não exiba os itens suspensos.
- **Detalhe do Cliente:** Reforçar a separação visual entre "A Receber" (Ativo) e "Cobranças Suspensas" na aba Financeiro, conforme já iniciado.

### 4. Validação e Testes
- Testar com cliente suspenso: confirmar que pendentes somem do financeiro geral mas ficam no histórico do cliente.
- Testar reativação: confirmar volta automática sem alteração de valores.
- Verificar MRR: garantir que a regra de MRR não foi afetada.

## Detalhes Técnicos
- A suspensão é baseada no `financial_collection_status` do cliente relacionado via `INNER JOIN` ou verificação pós-fetch.
- Uso de filtros em tempo de renderização ou na query para não afetar a persistência dos dados.
- Sem migrações de banco de dados adicionais; apenas lógica de visualização.
