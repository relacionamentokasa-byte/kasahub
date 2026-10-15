CREATE TABLE IF NOT EXISTS public.pricing_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  base_revenue numeric NOT NULL DEFAULT 13000 CHECK (base_revenue >= 0),
  total_pro_labore numeric NOT NULL DEFAULT 6484 CHECK (total_pro_labore >= 0),
  structure_cost numeric NOT NULL DEFAULT 2500 CHECK (structure_cost >= 0),
  profit_percent numeric NOT NULL DEFAULT 10 CHECK (profit_percent >= 0 AND profit_percent <= 100),
  billable_time_percent numeric NOT NULL DEFAULT 60 CHECK (billable_time_percent >= 0 AND billable_time_percent <= 100),
  billable_days numeric NOT NULL DEFAULT 48 CHECK (billable_days >= 0),
  day_rate numeric NOT NULL DEFAULT 215 CHECK (day_rate >= 0),
  third_party_multiplier numeric CHECK (third_party_multiplier IS NULL OR third_party_multiplier >= 0),
  mixed_third_party_multiplier numeric NOT NULL DEFAULT 1.3 CHECK (mixed_third_party_multiplier >= 0),
  urgency_percent numeric NOT NULL DEFAULT 30 CHECK (urgency_percent >= 0 AND urgency_percent <= 1000),
  max_freelance_days numeric NOT NULL DEFAULT 5 CHECK (max_freelance_days >= 0),
  sizes jsonb NOT NULL DEFAULT '{"P":{"days":0.5,"defaultPrice":110},"M":{"days":1,"defaultPrice":220},"G":{"days":2.5,"defaultPrice":650},"GG":{"days":4.5,"defaultPrice":1100}}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pricing_settings_singleton_idx ON public.pricing_settings ((true));

CREATE TABLE IF NOT EXISTS public.pricing_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_settings_id uuid NOT NULL REFERENCES public.pricing_settings(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_items ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb;

GRANT SELECT ON public.pricing_settings TO authenticated;
GRANT INSERT, UPDATE ON public.pricing_settings TO authenticated;
GRANT SELECT ON public.pricing_settings_history TO authenticated;
GRANT ALL ON public.pricing_settings, public.pricing_settings_history TO service_role;

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team reads pricing settings" ON public.pricing_settings
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins manage pricing settings" ON public.pricing_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE custom_role_id IN (SELECT id FROM public.custom_roles WHERE name IN ('Administrador', 'CEO'))));
CREATE POLICY "Admins update pricing settings" ON public.pricing_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE custom_role_id IN (SELECT id FROM public.custom_roles WHERE name IN ('Administrador', 'CEO'))))
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE custom_role_id IN (SELECT id FROM public.custom_roles WHERE name IN ('Administrador', 'CEO'))));
CREATE POLICY "Admins read pricing history" ON public.pricing_settings_history
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE custom_role_id IN (SELECT id FROM public.custom_roles WHERE name IN ('Administrador', 'CEO'))));

CREATE TRIGGER trg_pricing_settings_updated BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pricing_settings DEFAULT VALUES
ON CONFLICT DO NOTHING;
