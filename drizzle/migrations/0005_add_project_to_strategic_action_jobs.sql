ALTER TABLE public.strategic_action_jobs
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS strategic_action_jobs_project_id_idx
  ON public.strategic_action_jobs(project_id);

CREATE UNIQUE INDEX IF NOT EXISTS strategic_action_jobs_project_unique_idx
  ON public.strategic_action_jobs(project_id)
  WHERE project_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_strategic_action_job_project()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  action_client_id uuid;
  project_client_id uuid;
BEGIN
  IF NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT plan.client_id
    INTO action_client_id
  FROM public.strategic_nodes node
  JOIN public.strategic_plans plan ON plan.id = node.plan_id
  WHERE node.id = NEW.strategic_node_id
    AND node.type = 'action'
    AND plan.status = 'active';

  IF action_client_id IS NULL THEN
    RAISE EXCEPTION 'A execução precisa estar vinculada a uma ação estratégica ativa.';
  END IF;

  SELECT client_id INTO project_client_id
  FROM public.projects
  WHERE id = NEW.project_id;

  IF project_client_id IS NULL OR project_client_id <> action_client_id THEN
    RAISE EXCEPTION 'A campanha precisa pertencer ao mesmo cliente da ação estratégica.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS strategic_action_jobs_project_validation ON public.strategic_action_jobs;
CREATE TRIGGER strategic_action_jobs_project_validation
  BEFORE INSERT OR UPDATE OF project_id, strategic_node_id
  ON public.strategic_action_jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_strategic_action_job_project();

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS strategic_node_id uuid REFERENCES public.strategic_nodes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planning_month text;

CREATE INDEX IF NOT EXISTS jobs_strategic_node_month_idx
  ON public.jobs(strategic_node_id, planning_month);

CREATE OR REPLACE FUNCTION public.validate_job_strategic_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  action_client_id uuid;
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.strategic_node_id IS NULL
    AND OLD.planning_month IS NULL
    AND NEW.strategic_node_id IS NULL
    AND NEW.planning_month IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.strategic_node_id IS NULL OR NEW.planning_month IS NULL
    OR NEW.planning_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Jobs de cliente precisam estar vinculados a uma ação estratégica e a um mês.';
  END IF;

  SELECT plan.client_id
    INTO action_client_id
  FROM public.strategic_nodes node
  JOIN public.strategic_plans plan ON plan.id = node.plan_id
  WHERE node.id = NEW.strategic_node_id
    AND node.type = 'action'
    AND plan.status = 'active';

  IF action_client_id IS NULL OR action_client_id <> NEW.client_id THEN
    RAISE EXCEPTION 'A ação estratégica precisa pertencer ao mesmo cliente do job.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_strategic_context_validation ON public.jobs;
CREATE TRIGGER jobs_strategic_context_validation
  BEFORE INSERT OR UPDATE OF client_id, strategic_node_id, planning_month
  ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_job_strategic_context();

CREATE INDEX IF NOT EXISTS jobs_strategic_context_idx
  ON public.jobs(strategic_node_id, planning_month);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
