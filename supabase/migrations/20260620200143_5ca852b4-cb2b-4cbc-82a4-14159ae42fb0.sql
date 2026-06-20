DROP INDEX IF EXISTS public.idx_transactions_is_internal;
DROP INDEX IF EXISTS public.idx_transactions_is_investment;

ALTER TABLE public.transactions
  DROP COLUMN IF EXISTS is_internal,
  DROP COLUMN IF EXISTS is_investment;