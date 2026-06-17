## Atualizar "Clientes Ativos" na Saúde do Negócio

**Objetivo:** Contar como cliente ativo também quem teve apenas job avulso no mês, sem duplicar quem fez vários jobs.

### Nova regra
`Clientes Ativos = nº de clientes distintos com:`
- contrato/projeto recorrente ativo no mês, **OU**
- pelo menos 1 receita avulsa no mês

Cada cliente conta **uma única vez**, mesmo com múltiplos jobs avulsos ou contrato + avulso.

### Mudanças em `src/components/dashboard/SaudeNegocioSection.tsx`
1. Em `fetchSaudeNegocio`, montar um `Set<string>` unindo:
   - `client_id` dos `projects` com `status='active'` (já buscados)
   - `client_id` das `transactions` de receita avulsa do mês (já temos via `clientesFaturadosMes`)
2. Retornar `clientesAtivos = set.size` no objeto `m`.
3. Card "Clientes Ativos" passa a usar esse valor; subtítulo atualizado para "Recorrentes + avulsos do mês (distintos)".

### Impacto
- "Ticket Médio" continua usando `clientesFaturadosMes` (clientes que faturaram), sem alteração.
- "Clientes Ativos" agora reflete a base real de clientes do mês.
