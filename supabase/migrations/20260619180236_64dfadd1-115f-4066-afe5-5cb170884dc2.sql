ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS freelancer_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_freelancer_id ON public.transactions(freelancer_id);