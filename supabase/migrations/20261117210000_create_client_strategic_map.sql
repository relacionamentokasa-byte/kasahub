-- Persist the strategic reasoning workspace for each client.
CREATE TABLE public.strategic_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Plano estratégico',
  cycle_start date,
  cycle_end date,
  main_goal text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, title)
);

CREATE TABLE public.strategic_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('objective', 'evidence', 'idea', 'hypothesis', 'direction', 'action', 'result')),
  title text NOT NULL,
  description text,
  color text,
  position_x numeric NOT NULL DEFAULT 50,
  position_y numeric NOT NULL DEFAULT 50,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  linked_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  linked_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.strategic_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES public.strategic_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.strategic_nodes(id) ON DELETE CASCADE,
  relation text NOT NULL DEFAULT 'supports',
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_node_id, target_node_id),
  CHECK (source_node_id <> target_node_id)
);

CREATE INDEX strategic_plans_client_id_idx ON public.strategic_plans(client_id);
CREATE INDEX strategic_nodes_plan_id_idx ON public.strategic_nodes(plan_id);
CREATE INDEX strategic_nodes_project_id_idx ON public.strategic_nodes(linked_project_id);
CREATE INDEX strategic_nodes_job_id_idx ON public.strategic_nodes(linked_job_id);
CREATE INDEX strategic_edges_plan_id_idx ON public.strategic_edges(plan_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategic_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategic_nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategic_edges TO authenticated;
GRANT ALL ON public.strategic_plans, public.strategic_nodes, public.strategic_edges TO service_role;

ALTER TABLE public.strategic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage strategic plans" ON public.strategic_plans
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Clients can read their strategic plans" ON public.strategic_plans
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = strategic_plans.client_id AND c.portal_user_id = auth.uid()
  ));

CREATE POLICY "Team can manage strategic nodes" ON public.strategic_nodes
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Clients can read their strategic nodes" ON public.strategic_nodes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategic_plans p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = strategic_nodes.plan_id AND c.portal_user_id = auth.uid()
  ));

CREATE POLICY "Team can manage strategic edges" ON public.strategic_edges
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Clients can read their strategic edges" ON public.strategic_edges
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strategic_plans p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = strategic_edges.plan_id AND c.portal_user_id = auth.uid()
  ));

CREATE TRIGGER strategic_plans_updated
  BEFORE UPDATE ON public.strategic_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER strategic_nodes_updated
  BEFORE UPDATE ON public.strategic_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
