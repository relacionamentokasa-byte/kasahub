
-- Add sequential display number for transactions
CREATE SEQUENCE IF NOT EXISTS public.transaction_number_seq;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS number_display TEXT;

-- Backfill existing rows in created_at order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM public.transactions
  WHERE number_display IS NULL
)
UPDATE public.transactions t
SET number_display = '#' || LPAD(o.rn::text, 4, '0')
FROM ordered o
WHERE t.id = o.id;

-- Advance sequence past current max
SELECT setval('public.transaction_number_seq', COALESCE((
  SELECT MAX(NULLIF(regexp_replace(number_display, '\D', '', 'g'), '')::bigint)
  FROM public.transactions
), 0) + 1, false);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_number_display_idx ON public.transactions(number_display);

-- Trigger to auto-assign on insert
CREATE OR REPLACE FUNCTION public.set_transaction_number_display()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.number_display IS NULL OR NEW.number_display = '' THEN
    NEW.number_display := '#' || LPAD(nextval('public.transaction_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_transaction_number_display ON public.transactions;
CREATE TRIGGER trg_set_transaction_number_display
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_transaction_number_display();
