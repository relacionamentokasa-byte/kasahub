# Plano de Implementação: Edição de Demandas Extras (DME) Aprovadas

Este plano permite que demandas extras já aprovadas sejam editadas sem alterar seu status ou ID, e mantém o lançamento financeiro vinculado sincronizado (sem duplicar registros).

## Alterações

### 1. Interface de Usuário (Frontend)

- **Ações na Listagem:**
    - Em `src/routes/_authenticated/dmes.tsx`, adicionar a ação "Editar" (ícone de lápis) na coluna Ações, visível também para DMEs com status `approved`, mantendo todas as ações existentes.
    - Novo estado `editingDme` para controlar o modal.
- **Modal de Edição:**
    - Reutilizar o formulário existente (`DmeDraftRow`) em um `EditDmeDialog` que carrega os dados atuais: Título, Descrição, Cliente, Contrato, Responsável, Valor e Vencimento.
    - Se o lançamento vinculado estiver **pago**, os campos Valor e Vencimento ficam bloqueados, com aviso: "Esta demanda possui um lançamento financeiro já pago. Não é possível alterar o valor automaticamente."

### 2. Lógica de Persistência e Sincronização Financeira

- **Nova função `updateExtraDemandWithFinance(id, patch)` em `src/lib/ops-api.ts`:**
    1. Carregar a DME atual (valores antigos, `status`, `transaction_id`, `consolidated_transaction_id`).
    2. Preservar o status atual (`approved` continua `approved`); nunca chamar `approveExtraDemand` nem criar nova DME.
    3. Localizar o lançamento financeiro **exclusivamente pelo vínculo de ID** (`transaction_id`; quando consolidada, `consolidated_transaction_id`). Nunca buscar por valor, nome, cliente ou data.
    4. Se não houver vínculo: atualizar apenas a DME e informar que nenhum lançamento vinculado foi encontrado (não criar lançamento novo).
    5. Se o lançamento estiver `paid`: bloquear alteração de valor/vencimento e lançar erro com a mensagem acima, sem alterar nada.
    6. Se estiver em aberto (pendente/a vencer/atrasado): atualizar **o mesmo** lançamento com `amount` e `due_date` novos. Não alterar `status`, `nf_status` nem `boleto_internal_status`.
    7. Título/descrição: atualizar a DME; refletir na descrição do lançamento apenas se essa relação já existir hoje no sistema.
    8. Consolidada: quando a DME faz parte de cobrança consolidada, recalcular o total do lançamento a partir da soma das DMEs vinculadas (mantendo o mesmo lançamento).
- **Consistência:** validar o lançamento antes de gravar a DME; se a atualização do financeiro falhar, reverter/abortar e exibir erro — nunca concluir silenciosamente com valores divergentes.
- **Auditoria:** registrar via `logAudit` os valores anterior/novo (valor, vencimento, título, descrição) e indicar que o lançamento vinculado também foi atualizado. Histórico de aprovação (`approved_at`, `approved_by_client`) permanece intacto.
- **Cache:** invalidar `extra_demands`, `transactions` e grupos consolidados após salvar.

### 3. Feedback

- Sucesso: "Demanda atualizada com sucesso." (mais aviso quando o financeiro vinculado também foi atualizado).
- Erros de bloqueio (financeiro pago / sem vínculo) exibidos de forma clara.

## Detalhes Técnicos

- Campos de vínculo já existentes em `extra_demands`: `transaction_id` e `consolidated_transaction_id`.
- Campos sincronizados em `transactions`: `amount` e `due_date` apenas.
- DMEs não aprovadas mantêm o comportamento atual, sem alteração de fluxo.

## Plano de Teste

1. **Teste 1 — Valor e vencimento:** DME aprovada R$ 100 / 20-08 com financeiro pendente → editar para R$ 150 / 25-08. Verificar DME e o **mesmo** lançamento atualizados, status financeiro segue Pendente.
2. **Teste 2 — Título/descrição:** alterar e confirmar DME atualizada, status APROVADA mantido, sem duplicação financeira.
3. **Teste 3 — Financeiro pago:** tentar alterar valor → operação bloqueada com mensagem clara, nada alterado.
4. **Teste 4 — Duplicidade:** após edição, confirmar que existe apenas UM lançamento vinculado à DME.
5. **Persistência:** recarregar a página e confirmar dados novos; `number_display` (ex.: DME-056) inalterado.
