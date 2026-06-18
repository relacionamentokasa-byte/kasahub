## Objetivo

Permitir enviar várias DMEs juntas para o cliente: ele abre **um único link**, vê todas, aprova tudo de uma vez, e o sistema gera **uma única cobrança consolidada** no financeiro.

## Regras de negócio

- Agrupamento sempre **por cliente** (não mistura clientes diferentes).
- Só entram no lote DMEs com status `draft` ou `pending` (ainda não aprovadas/recusadas).
- Cada DME continua existindo individualmente (status, job, histórico). O "lote" é uma camada por cima.
- Aprovação é **tudo ou nada**: o cliente aprova o lote inteiro ou recusa. Não há aprovação parcial.
- Ao aprovar:
  - Cada DME do lote vira `approved` (dispara o trigger atual `handle_extra_demand_approval`, que já cria a transação individual).
  - Logo em seguida, as N transações individuais são **substituídas por 1 transação consolidada** com a soma dos valores, vencimento = maior `due_date` do lote, descrição "Cobrança consolidada — N DMEs".
- Recusa do lote marca todas como `rejected` com o mesmo motivo.

## Fluxo do usuário (interno)

1. Em `/dmes`, ativar modo seleção (checkbox por linha) — só aparecem checkboxes nas DMEs elegíveis (`draft`/`pending`) e bloqueia seleção de clientes diferentes.
2. Barra de ação no rodapé: "X DMEs selecionadas · R$ Y · [Gerar link de aprovação em lote]".
3. Ao confirmar, gera um `dme_batch` com token público e copia o link.

## Fluxo do cliente (público)

Rota pública nova `/dme-lote/$token`:
- Lista todas as DMEs do lote (título, descrição, valor, prazo).
- Total geral em destaque.
- Botões "Aprovar todas" e "Recusar" (com campo de motivo).
- Após aprovar: tela de confirmação + status "aguardando cobrança".

## Mudanças no banco

Nova tabela `dme_batches`:
- `client_id`, `public_token` (UUID único), `status` (`pending` / `approved` / `rejected` / `cancelled`)
- `total_value`, `consolidated_transaction_id` (FK para `transactions`)
- `approved_at`, `rejected_at`, `rejection_reason`, `signature_client`, `created_by`

Nova tabela de ligação `dme_batch_items`:
- `batch_id`, `extra_demand_id` (unique together)

Função `approve_dme_batch(batch_token, signature)`:
- Atualiza cada DME para `approved` (trigger gera as transações individuais).
- Cancela as N transações geradas (`status = 'cancelled'`).
- Cria 1 nova transação consolidada `pending` com a soma, vincula no `dme_batches.consolidated_transaction_id` e nas DMEs (campo novo `consolidated_transaction_id` em `extra_demands`).
- Marca batch como `approved`.

RLS:
- `dme_batches` / `dme_batch_items`: `authenticated` faz tudo; `anon` lê apenas pelo `public_token` (igual à página pública de DME individual hoje).

## Mudanças no código

### Backend
- `supabase/migrations/...sql` — tabelas, FKs, índices, RLS, função `approve_dme_batch`.
- `src/lib/dme-batches-api.ts` — `createBatch`, `fetchBatchByToken`, `approveBatch`, `rejectBatch`, `cancelBatch`.

### Interno (`/dmes`)
- `src/routes/_authenticated/dmes.tsx`:
  - Estado `selectedIds: Set<string>` + checkbox por linha (desabilitado se status ≠ draft/pending ou cliente diferente do primeiro selecionado).
  - Barra fixa no rodapé com total, contagem e botão "Gerar link em lote".
  - Diálogo de confirmação mostra resumo + ao confirmar copia o link `/dme-lote/<token>`.
  - Coluna mostra badge "Em lote #X" quando a DME já pertence a um batch ativo.

### Público
- `src/routes/dme-lote.$token.tsx` (rota pública, fora de `_authenticated`):
  - Loader carrega o batch + DMEs via `public_token`.
  - Componente lista DMEs, total, assinatura simples (input nome), aprovar/recusar.
  - Reutiliza visual da página pública de DME individual existente.

## Detalhes técnicos

- A função `approve_dme_batch` roda em transação Postgres para garantir atomicidade (todas DMEs viram approved + transações individuais canceladas + consolidada criada, ou nada).
- O link público é `https://<dominio>/dme-lote/<uuid>` — gerado no client com `window.location.origin`.
- Índices: `dme_batches(public_token)`, `dme_batches(client_id, status)`, `dme_batch_items(batch_id)`, `dme_batch_items(extra_demand_id)`.
- Política RLS para `anon` em `dme_batches`: `USING (true)` apenas no SELECT (igual ao padrão da DME pública), mas exposto somente via filtro por token na query do cliente.

## Fora de escopo (próximas iterações)

- Boleto/PIX automático na transação consolidada (hoje a cobrança fica `pending`; geração de boleto continua manual no financeiro).
- Aprovação parcial item-a-item.
- Edição do lote depois de criado (por enquanto: cancelar e criar de novo).
