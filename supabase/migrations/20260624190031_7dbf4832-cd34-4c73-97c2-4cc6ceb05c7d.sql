WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY job_id ORDER BY COALESCE(order_index, 0), created_at, id) - 1 AS new_idx
  FROM public.job_checklist
)
UPDATE public.job_checklist jc
SET order_index = r.new_idx
FROM ranked r
WHERE jc.id = r.id
  AND jc.order_index IS DISTINCT FROM r.new_idx;