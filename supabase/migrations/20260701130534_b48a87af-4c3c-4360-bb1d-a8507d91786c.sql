
CREATE TABLE public.editorial_month_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  strategy TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_month_strategies TO authenticated;
GRANT ALL ON public.editorial_month_strategies TO service_role;
ALTER TABLE public.editorial_month_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage editorial strategies" ON public.editorial_month_strategies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_editorial_month_strategies_updated
  BEFORE UPDATE ON public.editorial_month_strategies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
