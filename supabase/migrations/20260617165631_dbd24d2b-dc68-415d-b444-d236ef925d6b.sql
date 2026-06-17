
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert suppliers"
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can update suppliers"
  ON public.suppliers FOR UPDATE
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can delete suppliers"
  ON public.suppliers FOR DELETE
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_suppliers_name ON public.suppliers(name);

ALTER TABLE public.transactions
  ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_supplier_id ON public.transactions(supplier_id);
