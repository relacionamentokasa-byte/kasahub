## Objetivo
Garantir que **propostas, projetos e lançamentos financeiros** fiquem sempre vinculados ao **cliente** cadastrado, e que **projetos e lançamentos** possam ser ligados ao **serviço contratado** (contrato/proposta), permitindo navegação 360° pelo cliente.

---

## 1. Banco de dados (migration)
- Adicionar coluna `client_id uuid` em `public.proposals` (nullable, sem FK rígida — mesmo padrão das outras tabelas).
- Backfill: para propostas existentes, tentar casar `proposals.client_name` com `clients.company`/`clients.name` (case-insensitive) e preencher `client_id`.
- Nenhuma mudança em `projects` (já tem `client_id`), `contracts` (já tem `client_id` e `proposal_id`) e `transactions` (já tem `client_id`, `project_id`, `contract_id`, `proposal_id`).

## 2. Propostas — vínculo com cliente
**`src/routes/_authenticated/propostas.tsx` (dialog "Nova proposta")**
- Substituir os campos texto livre por um **Select de Cliente** (lista de `clients`, busca por empresa/nome).
- Ao escolher cliente, preencher automaticamente `client_name` e `client_email` (mantidos para o PDF/portal público).
- Manter opção "Cliente avulso" (texto livre) para casos pontuais.

**`src/lib/crm-api.ts`** — `createProposal` aceita `client_id?: string | null`.

**Editor (`ProposalEditorContent` em `propostas.$proposalId.tsx`)**
- Adicionar campo "Cliente vinculado" no header de configurações, editável.

## 3. Projetos — vínculo com serviço contratado
**`src/components/projects/NewProjectDialog.tsx` e `EditProjectDialog.tsx`**
- Manter Select de Cliente (já existe).
- Adicionar Select opcional de **Contrato/Proposta aprovada** do cliente selecionado (filtra `contracts` por `client_id`, mais propostas com `status='accepted'`).
- Persistir em `projects` reaproveitando colunas existentes — adicionar `contract_id` e `proposal_id` em `projects` na mesma migration (nullable).

## 4. Financeiro — cliente em receitas E despesas
**`src/components/finance/NewTransactionDialog.tsx`**
- Remover o `form.kind === "income"` que esconde o Select de Cliente — exibir para ambos os tipos.
- Adicionar Select opcional de **Contrato** e **Projeto** filtrados pelo cliente escolhido (já existem as colunas no schema).
- No `EditTransactionDialog` (se existir), mesmo tratamento.

## 5. Visualização 360° (já existe, só garantir)
- O `ClientDetailSheet` deve listar propostas, projetos, contratos e lançamentos do cliente — verificar e completar se faltar alguma aba.

---

## Arquivos
**Migration**
- Nova: adicionar `client_id` em `proposals`; adicionar `contract_id` e `proposal_id` em `projects`; backfill de `proposals.client_id`.

**Editar**
- `src/lib/crm-api.ts` — tipar `client_id` em create/update de proposta.
- `src/lib/ops-api.ts` — tipar novos campos em projetos.
- `src/routes/_authenticated/propostas.tsx` — dialog de criação com Select de cliente.
- `src/routes/_authenticated/propostas.$proposalId.tsx` — campo "Cliente" no editor.
- `src/components/projects/NewProjectDialog.tsx` + `EditProjectDialog.tsx` — Selects de contrato/proposta.
- `src/components/finance/NewTransactionDialog.tsx` — cliente sempre visível + contrato/projeto.
- `src/components/clients/ClientDetailSheet.tsx` — garantir abas Propostas/Contratos/Lançamentos.
