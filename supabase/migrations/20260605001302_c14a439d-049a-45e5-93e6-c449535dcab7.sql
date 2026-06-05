-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text,
  phone text,
  document text,
  logo_url text,
  banner_url text,
  brand_primary text DEFAULT '#FFBC45',
  brand_secondary text,
  website text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  owner_id uuid,
  portal_user_id uuid,
  lead_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage clients" ON public.clients FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Clients can read their own record" ON public.clients FOR SELECT TO authenticated
  USING (portal_user_id = auth.uid());
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  briefing text,
  status text NOT NULL DEFAULT 'active', -- active, paused, done, archived
  start_date date,
  due_date date,
  owner_id uuid,
  color text DEFAULT '#FFBC45',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage projects" ON public.projects FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Clients can read their projects" ON public.projects FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = projects.client_id AND c.portal_user_id = auth.uid()));
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage project members" ON public.project_members FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

-- ============ JOBS ============
CREATE TABLE public.job_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#FFBC45',
  order_index int NOT NULL DEFAULT 0,
  is_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_stages TO authenticated;
GRANT ALL ON public.job_stages TO service_role;
ALTER TABLE public.job_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read job stages" ON public.job_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can manage job stages" ON public.job_stages FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES public.job_stages(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  assignee_id uuid,
  priority text NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  due_date date,
  order_index int NOT NULL DEFAULT 0,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage jobs" ON public.jobs FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Clients can read their jobs" ON public.jobs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = jobs.client_id AND c.portal_user_id = auth.uid()));
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.job_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  content text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_checklist TO authenticated;
GRANT ALL ON public.job_checklist TO service_role;
ALTER TABLE public.job_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage checklist" ON public.job_checklist FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE TABLE public.job_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid,
  content text NOT NULL,
  mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_comments TO authenticated;
GRANT ALL ON public.job_comments TO service_role;
ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage job comments" ON public.job_comments FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

-- ============ SEED DEFAULT JOB STAGES ============
INSERT INTO public.job_stages (name, color, order_index, is_done) VALUES
  ('Planejamento', '#94A3B8', 0, false),
  ('Criação', '#FFBC45', 1, false),
  ('Copy', '#F59E0B', 2, false),
  ('Design', '#8B5CF6', 3, false),
  ('Aprovação', '#3B82F6', 4, false),
  ('Publicação', '#10B981', 5, false),
  ('Tráfego', '#EC4899', 6, false),
  ('Concluído', '#22C55E', 7, true);

-- ============ PROJECT PROGRESS HELPER ============
CREATE OR REPLACE FUNCTION public.project_progress(_project_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN count(*) = 0 THEN 0
    ELSE round(100.0 * count(*) FILTER (WHERE js.is_done OR j.done_at IS NOT NULL) / count(*), 0)
  END
  FROM public.jobs j
  LEFT JOIN public.job_stages js ON js.id = j.stage_id
  WHERE j.project_id = _project_id;
$$;