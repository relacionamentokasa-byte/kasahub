
CREATE TABLE public.contas_bancarias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  saldo_inicial numeric(12,2) NOT NULL DEFAULT 0,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_bancarias TO authenticated;
GRANT ALL ON public.contas_bancarias TO service_role;

ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contas"
  ON public.contas_bancarias FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contas"
  ON public.contas_bancarias FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contas"
  ON public.contas_bancarias FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contas"
  ON public.contas_bancarias FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER trg_contas_bancarias_updated_at
  BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transactions
  ADD COLUMN conta_id uuid REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_conta_id ON public.transactions(conta_id);
