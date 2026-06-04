
-- LEAD STAGES
CREATE TABLE public.lead_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#FFBC45',
  order_index integer NOT NULL DEFAULT 0,
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_stages TO authenticated;
GRANT ALL ON public.lead_stages TO service_role;
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read stages" ON public.lead_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage stages" ON public.lead_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_lead_stages_updated BEFORE UPDATE ON public.lead_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LEADS
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text,
  phone text,
  value numeric(14,2) NOT NULL DEFAULT 0,
  source text,
  stage_id uuid REFERENCES public.lead_stages(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  won_at timestamptz,
  lost_reason text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leads_stage ON public.leads(stage_id);

-- LEAD ACTIVITIES
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'note',
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read activities" ON public.lead_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage activities" ON public.lead_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_lead_activities_lead ON public.lead_activities(lead_id);

-- PROPOSALS
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  title text NOT NULL,
  client_name text NOT NULL,
  client_email text,
  intro text,
  monthly_investment numeric(14,2) NOT NULL DEFAULT 0,
  one_time_investment numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'draft',
  public_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  valid_until date,
  accepted_at timestamptz,
  accepted_ip text,
  accepted_name text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read proposals" ON public.proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage proposals" ON public.proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_proposals_updated BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROPOSAL ITEMS
CREATE TABLE public.proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  recurrence text NOT NULL DEFAULT 'one_time',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_items TO authenticated;
GRANT ALL ON public.proposal_items TO service_role;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read items" ON public.proposal_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage items" ON public.proposal_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_proposal_items_proposal ON public.proposal_items(proposal_id);

-- SEED default stages
INSERT INTO public.lead_stages (name, color, order_index, is_won, is_lost) VALUES
  ('Novo', '#94A3B8', 0, false, false),
  ('Qualificação', '#60A5FA', 1, false, false),
  ('Proposta', '#FFBC45', 2, false, false),
  ('Negociação', '#F97316', 3, false, false),
  ('Fechado', '#22C55E', 4, true, false),
  ('Perdido', '#EF4444', 5, false, true);
