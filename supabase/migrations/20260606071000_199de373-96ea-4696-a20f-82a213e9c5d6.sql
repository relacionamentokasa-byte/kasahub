
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS scope_text TEXT;

CREATE TABLE IF NOT EXISTS public.scope_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scope_templates TO authenticated;
GRANT ALL ON public.scope_templates TO service_role;

ALTER TABLE public.scope_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team manages scope templates"
  ON public.scope_templates FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE TRIGGER scope_templates_updated_at
  BEFORE UPDATE ON public.scope_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
