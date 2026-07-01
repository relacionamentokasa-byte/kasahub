
ALTER TABLE public.extra_demands ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE OR REPLACE FUNCTION public.fn_dme_mark_paid_from_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid') THEN
    -- DME individual vinculada
    IF NEW.extra_demand_id IS NOT NULL THEN
      UPDATE public.extra_demands
         SET status = 'completed',
             paid_at = COALESCE(paid_at, now()),
             updated_at = now()
       WHERE id = NEW.extra_demand_id
         AND status NOT IN ('completed','rejected','cancelled');
    END IF;

    -- Transação consolidada (lote): fecha todas as DMEs vinculadas
    UPDATE public.extra_demands
       SET status = 'completed',
           paid_at = COALESCE(paid_at, now()),
           updated_at = now()
     WHERE consolidated_transaction_id = NEW.id
       AND status NOT IN ('completed','rejected','cancelled');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dme_mark_paid_from_transaction ON public.transactions;
CREATE TRIGGER trg_dme_mark_paid_from_transaction
AFTER UPDATE OF status ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_dme_mark_paid_from_transaction();

-- Backfill: DMEs cujas transações já estão pagas
UPDATE public.extra_demands ed
   SET status = 'completed',
       paid_at = COALESCE(ed.paid_at, t.updated_at, now())
  FROM public.transactions t
 WHERE (t.extra_demand_id = ed.id OR t.id = ed.consolidated_transaction_id)
   AND t.status = 'paid'
   AND ed.status NOT IN ('completed','rejected','cancelled');
