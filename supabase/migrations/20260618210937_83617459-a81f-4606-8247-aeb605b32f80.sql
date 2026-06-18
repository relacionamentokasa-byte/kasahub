
-- 1. Add consolidated_transaction_id to extra_demands
ALTER TABLE public.extra_demands
  ADD COLUMN IF NOT EXISTS consolidated_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- 2. dme_batches table
CREATE TABLE public.dme_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  public_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  total_value NUMERIC NOT NULL DEFAULT 0,
  consolidated_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  due_date DATE,
  signature_client TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dme_batches TO authenticated;
GRANT SELECT, UPDATE ON public.dme_batches TO anon;
GRANT ALL ON public.dme_batches TO service_role;

ALTER TABLE public.dme_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members manage batches"
  ON public.dme_batches FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Public can read batches by token"
  ON public.dme_batches FOR SELECT TO anon
  USING (true);

CREATE POLICY "Public can update approval fields"
  ON public.dme_batches FOR UPDATE TO anon
  USING (status = 'pending')
  WITH CHECK (status IN ('approved','rejected'));

CREATE INDEX idx_dme_batches_token ON public.dme_batches(public_token);
CREATE INDEX idx_dme_batches_client ON public.dme_batches(client_id, status);

CREATE TRIGGER update_dme_batches_updated_at
  BEFORE UPDATE ON public.dme_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. dme_batch_items
CREATE TABLE public.dme_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.dme_batches(id) ON DELETE CASCADE,
  extra_demand_id UUID NOT NULL REFERENCES public.extra_demands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, extra_demand_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dme_batch_items TO authenticated;
GRANT SELECT ON public.dme_batch_items TO anon;
GRANT ALL ON public.dme_batch_items TO service_role;

ALTER TABLE public.dme_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members manage batch items"
  ON public.dme_batch_items FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Public can read batch items"
  ON public.dme_batch_items FOR SELECT TO anon
  USING (true);

CREATE INDEX idx_dme_batch_items_batch ON public.dme_batch_items(batch_id);
CREATE INDEX idx_dme_batch_items_dme ON public.dme_batch_items(extra_demand_id);

-- 4. approve_dme_batch function (atomic)
CREATE OR REPLACE FUNCTION public.approve_dme_batch(p_token UUID, p_signature TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_max_due DATE;
  v_count INT;
  v_tx_id UUID;
BEGIN
  SELECT * INTO v_batch FROM public.dme_batches WHERE public_token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote não encontrado'; END IF;
  IF v_batch.status <> 'pending' THEN RAISE EXCEPTION 'Lote já processado (%)', v_batch.status; END IF;

  -- Approve all DMEs in the batch (trigger creates individual transactions)
  UPDATE public.extra_demands ed
     SET status = 'approved',
         signature_client = COALESCE(ed.signature_client, p_signature)
   WHERE ed.id IN (SELECT extra_demand_id FROM public.dme_batch_items WHERE batch_id = v_batch.id)
     AND ed.status IN ('draft','pending','sent','pending_approval');

  -- Cancel the individual transactions just created
  UPDATE public.transactions
     SET status = 'cancelled'
   WHERE extra_demand_id IN (SELECT extra_demand_id FROM public.dme_batch_items WHERE batch_id = v_batch.id)
     AND status = 'pending';

  -- Compute totals
  SELECT COUNT(*), MAX(COALESCE(ed.due_date, CURRENT_DATE + INTERVAL '7 days'))
    INTO v_count, v_max_due
    FROM public.extra_demands ed
    JOIN public.dme_batch_items bi ON bi.extra_demand_id = ed.id
   WHERE bi.batch_id = v_batch.id;

  -- Create consolidated transaction
  INSERT INTO public.transactions (
    description, amount, type, kind, status, due_date, client_id
  ) VALUES (
    'Cobrança consolidada — ' || v_count || ' DMEs (Lote ' || substring(v_batch.id::text, 1, 8) || ')',
    v_batch.total_value,
    'income', 'income', 'pending',
    COALESCE(v_batch.due_date, v_max_due),
    v_batch.client_id
  ) RETURNING id INTO v_tx_id;

  -- Link consolidated tx back to DMEs and batch
  UPDATE public.extra_demands
     SET consolidated_transaction_id = v_tx_id
   WHERE id IN (SELECT extra_demand_id FROM public.dme_batch_items WHERE batch_id = v_batch.id);

  UPDATE public.dme_batches
     SET status = 'approved',
         approved_at = now(),
         signature_client = p_signature,
         consolidated_transaction_id = v_tx_id
   WHERE id = v_batch.id;

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_dme_batch(UUID, TEXT) TO anon, authenticated;

-- 5. reject_dme_batch
CREATE OR REPLACE FUNCTION public.reject_dme_batch(p_token UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_batch RECORD;
BEGIN
  SELECT * INTO v_batch FROM public.dme_batches WHERE public_token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote não encontrado'; END IF;
  IF v_batch.status <> 'pending' THEN RAISE EXCEPTION 'Lote já processado'; END IF;

  UPDATE public.extra_demands
     SET status = 'rejected', rejection_reason = p_reason
   WHERE id IN (SELECT extra_demand_id FROM public.dme_batch_items WHERE batch_id = v_batch.id)
     AND status IN ('draft','pending','sent','pending_approval');

  UPDATE public.dme_batches
     SET status = 'rejected', rejected_at = now(), rejection_reason = p_reason
   WHERE id = v_batch.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_dme_batch(UUID, TEXT) TO anon, authenticated;
