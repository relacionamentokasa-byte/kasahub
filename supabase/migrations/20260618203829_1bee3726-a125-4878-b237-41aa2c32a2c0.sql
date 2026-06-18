
-- 1. COMPANY_PARTNERS (Sócios da empresa)
CREATE TABLE public.company_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  distribution_type TEXT NOT NULL DEFAULT 'profit_share'
    CHECK (distribution_type IN ('profit_share','pro_labore_only')),
  share_percentage NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (share_percentage >= 0 AND share_percentage <= 100),
  pro_labore_amount NUMERIC(14,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_partners TO authenticated;
GRANT ALL ON public.company_partners TO service_role;
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team reads company partners" ON public.company_partners
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

CREATE POLICY "Admins manage company partners" ON public.company_partners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role));

CREATE TRIGGER trg_company_partners_updated_at
  BEFORE UPDATE ON public.company_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.company_partners (full_name, distribution_type, share_percentage) VALUES
  ('Amanda Ariel',     'profit_share',     33.34),
  ('Alessandra Matos', 'profit_share',     33.33),
  ('Ian Matheus',      'profit_share',     33.33),
  ('Ariel Matos',      'pro_labore_only',  0);

-- 2. PARTNER_ADVANCES (Vales)
CREATE TABLE public.partner_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.company_partners(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','partially_settled','settled','cancelled')),
  settled_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_advances TO authenticated;
GRANT ALL ON public.partner_advances TO service_role;
ALTER TABLE public.partner_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage advances" ON public.partner_advances
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role));

CREATE TRIGGER trg_partner_advances_updated_at
  BEFORE UPDATE ON public.partner_advances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_partner_advances_partner ON public.partner_advances(partner_id, status);

-- 3. TRANSACTIONS.nature
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS nature TEXT NOT NULL DEFAULT 'operacional'
    CHECK (nature IN ('operacional','nao_operacional'));

CREATE INDEX IF NOT EXISTS idx_transactions_nature ON public.transactions(nature);

COMMENT ON COLUMN public.transactions.nature IS
  'operacional = entra na base de distribuição aos sócios; nao_operacional = caixa mas fora da distribuição (consórcio, venda de ativo, reembolso, aporte)';
