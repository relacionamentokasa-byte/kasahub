-- Agency settings (single-row config) + team invites
CREATE TABLE public.agency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Kasa Marketing',
  legal_name text,
  document text,
  email text,
  phone text,
  website text,
  address text,
  logo_url text,
  banner_url text,
  brand_primary text DEFAULT '#FFBC45',
  brand_secondary text,
  default_currency text NOT NULL DEFAULT 'BRL',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  notify_email boolean NOT NULL DEFAULT true,
  notify_whatsapp boolean NOT NULL DEFAULT false,
  integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_settings TO authenticated;
GRANT ALL ON public.agency_settings TO service_role;

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read settings" ON public.agency_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write settings" ON public.agency_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE TRIGGER tg_agency_settings_updated
  BEFORE UPDATE ON public.agency_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed single row
INSERT INTO public.agency_settings (name) VALUES ('Kasa Marketing Consultoria')
ON CONFLICT DO NOTHING;

-- Team invites (for inviting people by email; account is created when they sign up)
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'operador',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team reads invites" ON public.team_invites
  FOR SELECT TO authenticated USING (is_team_member(auth.uid()));
CREATE POLICY "Admins manage invites" ON public.team_invites
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tg_team_invites_updated
  BEFORE UPDATE ON public.team_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
