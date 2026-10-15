-- Consolidate proposal copies into the original contract when they represent the same client contract.
WITH ranked AS (
  SELECT
    c.id,
    FIRST_VALUE(c.id) OVER (
      PARTITION BY c.client_id, lower(regexp_replace(trim(c.title), '\s*\(c[oó]pia\)\s*$', '')), c.start_date
      ORDER BY
        (SELECT count(*) FROM public.transactions t WHERE t.contract_id = c.id) DESC,
        CASE WHEN lower(trim(c.title)) ~ '\(c[oó]pia\)\s*$' THEN 1 ELSE 0 END,
        c.created_at ASC NULLS LAST,
        c.id ASC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY c.client_id, lower(regexp_replace(trim(c.title), '\s*\(c[oó]pia\)\s*$', '')), c.start_date
      ORDER BY
        (SELECT count(*) FROM public.transactions t WHERE t.contract_id = c.id) DESC,
        CASE WHEN lower(trim(c.title)) ~ '\(c[oó]pia\)\s*$' THEN 1 ELSE 0 END,
        c.created_at ASC NULLS LAST,
        c.id ASC
    ) AS duplicate_rank
  FROM public.contracts c
), duplicates AS (
  SELECT id, keep_id FROM ranked WHERE duplicate_rank > 1
)
UPDATE public.transactions t
SET contract_id = d.keep_id
FROM duplicates d
WHERE t.contract_id = d.id;

WITH ranked AS (
  SELECT
    c.id,
    FIRST_VALUE(c.id) OVER (
      PARTITION BY c.client_id, lower(regexp_replace(trim(c.title), '\s*\(c[oó]pia\)\s*$', '')), c.start_date
      ORDER BY
        (SELECT count(*) FROM public.transactions t WHERE t.contract_id = c.id) DESC,
        CASE WHEN lower(trim(c.title)) ~ '\(c[oó]pia\)\s*$' THEN 1 ELSE 0 END,
        c.created_at ASC NULLS LAST,
        c.id ASC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY c.client_id, lower(regexp_replace(trim(c.title), '\s*\(c[oó]pia\)\s*$', '')), c.start_date
      ORDER BY
        (SELECT count(*) FROM public.transactions t WHERE t.contract_id = c.id) DESC,
        CASE WHEN lower(trim(c.title)) ~ '\(c[oó]pia\)\s*$' THEN 1 ELSE 0 END,
        c.created_at ASC NULLS LAST,
        c.id ASC
    ) AS duplicate_rank
  FROM public.contracts c
), duplicates AS (
  SELECT id, keep_id FROM ranked WHERE duplicate_rank > 1
)
UPDATE public.proposals p
SET generated_contract_id = d.keep_id
FROM duplicates d
WHERE p.generated_contract_id = d.id;

WITH ranked AS (
  SELECT
    c.id,
    FIRST_VALUE(c.id) OVER (
      PARTITION BY c.client_id, lower(regexp_replace(trim(c.title), '\s*\(c[oó]pia\)\s*$', '')), c.start_date
      ORDER BY
        (SELECT count(*) FROM public.transactions t WHERE t.contract_id = c.id) DESC,
        CASE WHEN lower(trim(c.title)) ~ '\(c[oó]pia\)\s*$' THEN 1 ELSE 0 END,
        c.created_at ASC NULLS LAST,
        c.id ASC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY c.client_id, lower(regexp_replace(trim(c.title), '\s*\(c[oó]pia\)\s*$', '')), c.start_date
      ORDER BY
        (SELECT count(*) FROM public.transactions t WHERE t.contract_id = c.id) DESC,
        CASE WHEN lower(trim(c.title)) ~ '\(c[oó]pia\)\s*$' THEN 1 ELSE 0 END,
        c.created_at ASC NULLS LAST,
        c.id ASC
    ) AS duplicate_rank
  FROM public.contracts c
), duplicates AS (
  SELECT id, keep_id FROM ranked WHERE duplicate_rank > 1
)
UPDATE public.projects p
SET contract_id = d.keep_id
FROM duplicates d
WHERE p.contract_id = d.id;

WITH ranked AS (
  SELECT
    c.id,
    ROW_NUMBER() OVER (
      PARTITION BY c.client_id, lower(regexp_replace(trim(c.title), '\s*\(c[oó]pia\)\s*$', '')), c.start_date
      ORDER BY
        (SELECT count(*) FROM public.transactions t WHERE t.contract_id = c.id) DESC,
        CASE WHEN lower(trim(c.title)) ~ '\(c[oó]pia\)\s*$' THEN 1 ELSE 0 END,
        c.created_at ASC NULLS LAST,
        c.id ASC
    ) AS duplicate_rank
  FROM public.contracts c
)
DELETE FROM public.contracts c
USING ranked r
WHERE c.id = r.id
  AND r.duplicate_rank > 1;
