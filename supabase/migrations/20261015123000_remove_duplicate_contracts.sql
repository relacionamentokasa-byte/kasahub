-- Consolidate exact duplicate contracts while preserving the newest record.
WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY
        client_id,
        lower(trim(title)),
        start_date
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY
        client_id,
        lower(trim(title)),
        start_date
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM public.contracts
), duplicates AS (
  SELECT id, keep_id
  FROM ranked
  WHERE duplicate_rank > 1
)
UPDATE public.transactions AS t
SET contract_id = d.keep_id
FROM duplicates AS d
WHERE t.contract_id = d.id;

WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY
        client_id,
        lower(trim(title)),
        start_date
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY
        client_id,
        lower(trim(title)),
        start_date
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM public.contracts
), duplicates AS (
  SELECT id, keep_id
  FROM ranked
  WHERE duplicate_rank > 1
)
UPDATE public.proposals AS p
SET generated_contract_id = d.keep_id
FROM duplicates AS d
WHERE p.generated_contract_id = d.id;

WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY
        client_id,
        lower(trim(title)),
        start_date
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY
        client_id,
        lower(trim(title)),
        start_date
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM public.contracts
), duplicates AS (
  SELECT id, keep_id
  FROM ranked
  WHERE duplicate_rank > 1
)
UPDATE public.projects AS p
SET contract_id = d.keep_id
FROM duplicates AS d
WHERE p.contract_id = d.id;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        client_id,
        lower(trim(title)),
        start_date
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM public.contracts
)
DELETE FROM public.contracts AS c
USING ranked AS r
WHERE c.id = r.id
  AND r.duplicate_rank > 1;
