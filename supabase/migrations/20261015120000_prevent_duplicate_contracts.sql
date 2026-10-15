-- Keep one canonical contract per proposal without deleting historical records.
WITH ranked_contracts AS (
  SELECT
    id,
    proposal_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY proposal_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY proposal_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS position
  FROM public.contracts
  WHERE proposal_id IS NOT NULL
), duplicate_contracts AS (
  SELECT id, canonical_id
  FROM ranked_contracts
  WHERE position > 1
)
UPDATE public.proposals AS p
SET generated_contract_id = d.canonical_id
FROM duplicate_contracts AS d
WHERE p.generated_contract_id = d.id;

WITH ranked_contracts AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY proposal_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS position
  FROM public.contracts
  WHERE proposal_id IS NOT NULL
)
UPDATE public.contracts AS c
SET proposal_id = NULL,
    updated_at = now()
FROM ranked_contracts AS r
WHERE c.id = r.id
  AND r.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_one_per_proposal_idx
  ON public.contracts (proposal_id)
  WHERE proposal_id IS NOT NULL;

-- The application approval flow is the single source of contract creation.
DROP TRIGGER IF EXISTS tr_proposal_accepted ON public.proposals;
