-- Keep recurring strategic actions separate from the concrete job executed in each month.
CREATE TABLE public.strategic_action_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategic_node_id uuid NOT NULL REFERENCES public.strategic_nodes(id) ON DELETE CASCADE,
  planning_month text NOT NULL CHECK (planning_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (strategic_node_id, planning_month)
);

CREATE INDEX strategic_action_jobs_node_month_idx
  ON public.strategic_action_jobs(strategic_node_id, planning_month);
CREATE INDEX strategic_action_jobs_job_id_idx
  ON public.strategic_action_jobs(job_id);

-- Existing actions with a global job keep that job only in their first planned month.
INSERT INTO public.strategic_action_jobs (strategic_node_id, planning_month, job_id)
SELECT
  node.id,
  COALESCE(node.metadata ->> 'planning_start', node.metadata ->> 'planning_month'),
  node.linked_job_id
FROM public.strategic_nodes AS node
WHERE node.type = 'action'
  AND node.linked_job_id IS NOT NULL
  AND COALESCE(node.metadata ->> 'planning_start', node.metadata ->> 'planning_month') ~ '^\d{4}-(0[1-9]|1[0-2])$'
ON CONFLICT (strategic_node_id, planning_month) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategic_action_jobs TO authenticated;
GRANT ALL ON public.strategic_action_jobs TO service_role;

ALTER TABLE public.strategic_action_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage strategic action jobs" ON public.strategic_action_jobs
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Clients can read their strategic action jobs" ON public.strategic_action_jobs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.strategic_nodes node
    JOIN public.strategic_plans plan ON plan.id = node.plan_id
    JOIN public.clients client ON client.id = plan.client_id
    WHERE node.id = strategic_action_jobs.strategic_node_id
      AND client.portal_user_id = auth.uid()
  ));

CREATE TRIGGER strategic_action_jobs_updated
  BEFORE UPDATE ON public.strategic_action_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
