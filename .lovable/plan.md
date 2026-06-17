## Ajuste no KPI Ticket Médio

### Problema atual
- Numerador: MRR + Receita Avulsa do mês (todas as transações `income`)
- Denominador: `projects.status = 'active'` (3 clientes)
- Resultado: clientes que só geraram job avulso no mês entram na receita mas não na contagem → ticket inflado.

### Nova fórmula
```
Ticket Médio = (MRR + Avulsa) ÷ nº de clientes distintos com receita no mês
```

### Mudança técnica (apenas em `src/components/dashboard/SaudeNegocioSection.tsx`)

1. Incluir `client_id` no `select` de `transactions` em `fetchSaudeNegocio`.
2. Calcular `clientesFaturadosMes` = `new Set(incomes.map(t => t.client_id).filter(Boolean)).size`.
3. Retornar o novo campo junto com os demais.
4. No card "Ticket Médio":
   - Trocar denominador para `clientesFaturadosMes`.
   - Atualizar `subValue` para `"(MRR + Avulsa) ÷ clientes que faturaram no mês"`.
5. Card "Clientes Ativos" permanece como está (projetos em andamento) — são métricas diferentes.

### Edge cases
- Sem receita no mês → ticket = R$ 0 (mantém guarda `> 0`).
- Transações sem `client_id` (despesas internas, lançamentos manuais) são ignoradas no Set.

Nenhuma alteração no banco, em outros componentes ou na lógica de MRR/Avulsa.
