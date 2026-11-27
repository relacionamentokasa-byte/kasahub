-- Keep one operational campaign per strategic action/month and make campaign creation atomic.
ALTER TABLE public.strategic_action_jobs
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.strategic_action_job_conflict_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  kept_execution_id uuid,
  released_execution_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, released_execution_id)
);

ALTER TABLE public.strategic_action_job_conflict_audit ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.strategic_action_job_conflict_audit TO authenticated;
GRANT ALL ON public.strategic_action_job_conflict_audit TO service_role;

DROP POLICY IF EXISTS "Team can read strategic action job conflict audit"
  ON public.strategic_action_job_conflict_audit;
CREATE POLICY "Team can read strategic action job conflict audit"
  ON public.strategic_action_job_conflict_audit
  FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE INDEX IF NOT EXISTS strategic_action_jobs_project_id_idx
  ON public.strategic_action_jobs(project_id);

-- The previous migration creates this index, but rebuilding it here lets a partially
-- migrated database normalize old duplicate links before enforcing the invariant.
DROP INDEX IF EXISTS public.strategic_action_jobs_project_unique_idx;

WITH ranked_links AS (
  SELECT
    id,
    project_id,
    first_value(id) OVER (
      PARTITION BY project_id
      ORDER BY (job_id IS NOT NULL) DESC, created_at ASC, id ASC
    ) AS kept_execution_id,
    row_number() OVER (
      PARTITION BY project_id
      ORDER BY (job_id IS NOT NULL) DESC, created_at ASC, id ASC
    ) AS link_rank
  FROM public.strategic_action_jobs
  WHERE project_id IS NOT NULL
)
INSERT INTO public.strategic_action_job_conflict_audit (
  project_id,
  kept_execution_id,
  released_execution_id,
  reason
)
SELECT
  project_id,
  kept_execution_id,
  id,
  'Projeto estava vinculado a mais de uma execução mensal; o vínculo mais antigo com job foi preservado.'
FROM ranked_links
WHERE link_rank > 1
ON CONFLICT (project_id, released_execution_id) DO NOTHING;

WITH ranked_links AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY project_id
      ORDER BY (job_id IS NOT NULL) DESC, created_at ASC, id ASC
    ) AS link_rank
  FROM public.strategic_action_jobs
  WHERE project_id IS NOT NULL
)
UPDATE public.strategic_action_jobs AS execution
SET project_id = NULL
FROM ranked_links
WHERE execution.id = ranked_links.id
  AND ranked_links.link_rank > 1;

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
  job_client_id uuid;
  job_project_id uuid;
  job_node_id uuid;
  job_planning_month text;
BEGIN
  SELECT plan.client_id
    INTO action_client_id
  FROM public.strategic_nodes AS node
  JOIN public.strategic_plans AS plan ON plan.id = node.plan_id
  WHERE node.id = NEW.strategic_node_id
    AND node.type = 'action'
    AND plan.status = 'active';

  IF action_client_id IS NULL THEN
    RAISE EXCEPTION
      'A execução precisa estar vinculada a uma ação estratégica ativa.';
  END IF;

  IF NEW.project_id IS NOT NULL THEN
    SELECT client_id
      INTO project_client_id
    FROM public.projects
    WHERE id = NEW.project_id;

    IF project_client_id IS NULL OR project_client_id <> action_client_id THEN
      RAISE EXCEPTION
        'A campanha precisa pertencer ao mesmo cliente da ação estratégica.';
    END IF;
  END IF;

  IF NEW.job_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    client_id,
    project_id,
    strategic_node_id,
    planning_month
    INTO job_client_id, job_project_id, job_node_id, job_planning_month
  FROM public.jobs
  WHERE id = NEW.job_id;

  IF job_client_id IS NULL THEN
    RAISE EXCEPTION 'A entrega vinculada não possui um cliente válido.';
  END IF;

  IF job_client_id <> action_client_id THEN
    RAISE EXCEPTION
      'A entrega precisa pertencer ao mesmo cliente da ação estratégica.';
  END IF;

  IF NEW.project_id IS DISTINCT FROM job_project_id THEN
    RAISE EXCEPTION
      'A entrega precisa permanecer na campanha desta execução mensal.';
  END IF;

  IF job_node_id IS NOT NULL AND job_node_id <> NEW.strategic_node_id THEN
    RAISE EXCEPTION
      'A entrega está vinculada a outra ação estratégica.';
  END IF;

  IF job_planning_month IS NOT NULL
     AND job_planning_month <> NEW.planning_month THEN
    RAISE EXCEPTION
      'A entrega está vinculada a outro mês de planejamento.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS strategic_action_jobs_project_validation
  ON public.strategic_action_jobs;
CREATE TRIGGER strategic_action_jobs_project_validation
  BEFORE INSERT OR UPDATE OF project_id, strategic_node_id, planning_month, job_id
  ON public.strategic_action_jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_strategic_action_job_project();

CREATE OR REPLACE FUNCTION public.validate_job_strategic_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  action_client_id uuid;
  project_client_id uuid;
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

  IF NEW.strategic_node_id IS NULL
    OR NEW.planning_month IS NULL
    OR NEW.planning_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    OR NEW.project_id IS NULL THEN
    RAISE EXCEPTION
      'Jobs de cliente precisam estar vinculados a uma ação estratégica, um mês e uma campanha.';
  END IF;

  SELECT plan.client_id
    INTO action_client_id
  FROM public.strategic_nodes AS node
  JOIN public.strategic_plans AS plan ON plan.id = node.plan_id
  WHERE node.id = NEW.strategic_node_id
    AND node.type = 'action'
    AND plan.status = 'active';

  IF action_client_id IS NULL OR action_client_id <> NEW.client_id THEN
    RAISE EXCEPTION
      'A ação estratégica precisa pertencer ao mesmo cliente do job.';
  END IF;

  SELECT client_id
    INTO project_client_id
  FROM public.projects
  WHERE id = NEW.project_id;

  IF project_client_id IS NULL OR project_client_id <> NEW.client_id THEN
    RAISE EXCEPTION
      'O projeto selecionado precisa pertencer ao mesmo cliente do job.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_strategic_context_validation ON public.jobs;
CREATE TRIGGER jobs_strategic_context_validation
  BEFORE INSERT OR UPDATE OF client_id, project_id, strategic_node_id, planning_month
  ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_job_strategic_context();

CREATE OR REPLACE FUNCTION public.ensure_strategic_monthly_campaign(
  p_strategic_node_id uuid,
  p_planning_month text,
  p_name text DEFAULT NULL
)
RETURNS TABLE (
  execution_id uuid,
  project_id uuid,
  project_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_client_id uuid;
  existing_execution_id uuid;
  existing_project_id uuid;
  existing_job_id uuid;
  job_project_id uuid;
  job_client_id uuid;
  job_node_id uuid;
  job_planning_month text;
  campaign_name text;
  generated_project_name text;
  conflicting_execution_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_team_member(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas membros da equipe podem criar campanhas estratégicas.'
      USING ERRCODE = '42501';
  END IF;

  IF p_planning_month IS NULL
    OR p_planning_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'O mês da execução precisa estar no formato AAAA-MM.';
  END IF;

  -- Lock the action so two monthly campaign requests for the same action
  -- cannot both decide that a project still needs to be created.
  SELECT plan.client_id
    INTO action_client_id
  FROM public.strategic_nodes AS node
  JOIN public.strategic_plans AS plan ON plan.id = node.plan_id
  WHERE node.id = p_strategic_node_id
    AND node.type = 'action'
    AND plan.status = 'active'
  FOR UPDATE OF node;

  IF action_client_id IS NULL THEN
    RAISE EXCEPTION
      'A ação estratégica precisa existir e estar vinculada a um plano ativo.';
  END IF;

  -- Insert the placeholder before creating a project. If another writer added
  -- the execution concurrently, its row is reused and no project is orphaned.
  INSERT INTO public.strategic_action_jobs (strategic_node_id, planning_month)
  VALUES (p_strategic_node_id, p_planning_month)
  ON CONFLICT (strategic_node_id, planning_month) DO NOTHING;

  SELECT
    execution.id,
    execution.project_id,
    execution.job_id
    INTO existing_execution_id, existing_project_id, existing_job_id
  FROM public.strategic_action_jobs AS execution
  WHERE execution.strategic_node_id = p_strategic_node_id
    AND execution.planning_month = p_planning_month
  FOR UPDATE OF execution;

  IF existing_job_id IS NOT NULL THEN
    SELECT
      client_id,
      project_id,
      strategic_node_id,
      planning_month
      INTO job_client_id, job_project_id, job_node_id, job_planning_month
    FROM public.jobs
    WHERE id = existing_job_id;

    IF job_client_id IS NULL THEN
      RAISE EXCEPTION 'A entrega vinculada não possui um cliente válido.';
    END IF;

    IF job_client_id <> action_client_id THEN
      RAISE EXCEPTION
        'A entrega vinculada pertence a outro cliente.';
    END IF;

    IF job_node_id IS NOT NULL AND job_node_id <> p_strategic_node_id THEN
      RAISE EXCEPTION
        'A entrega vinculada pertence a outra ação estratégica.';
    END IF;

    IF job_planning_month IS NOT NULL
       AND job_planning_month <> p_planning_month THEN
      RAISE EXCEPTION
        'A entrega vinculada pertence a outro mês de planejamento.';
    END IF;

    IF existing_project_id IS NOT NULL
       AND job_project_id IS DISTINCT FROM existing_project_id THEN
      RAISE EXCEPTION
        'A entrega vinculada precisa permanecer na campanha desta execução mensal.';
    END IF;

    IF existing_project_id IS NULL AND job_project_id IS NOT NULL THEN
      existing_project_id := job_project_id;
    END IF;

    IF existing_project_id IS NULL THEN
      RAISE EXCEPTION
        'A entrega legada vinculada precisa ser revisada antes de criar a campanha desta execução mensal.';
    END IF;
  END IF;

  IF existing_project_id IS NOT NULL THEN
    SELECT name
      INTO generated_project_name
    FROM public.projects
    WHERE id = existing_project_id
      AND client_id = action_client_id;

    IF generated_project_name IS NULL THEN
      RAISE EXCEPTION
        'A campanha desta execução não pertence ao cliente da ação estratégica.';
    END IF;

    SELECT execution.id
      INTO conflicting_execution_id
    FROM public.strategic_action_jobs AS execution
    WHERE execution.project_id = existing_project_id
      AND execution.id <> existing_execution_id
    LIMIT 1;

    IF conflicting_execution_id IS NOT NULL THEN
      RAISE EXCEPTION
        'Esta campanha já está vinculada a outra ação ou mês. Escolha uma campanha diferente.';
    END IF;

    UPDATE public.strategic_action_jobs
    SET project_id = existing_project_id
    WHERE id = existing_execution_id
      AND project_id IS NULL;

    RETURN QUERY SELECT
      existing_execution_id,
      existing_project_id,
      generated_project_name;
    RETURN;
  END IF;

  IF existing_job_id IS NOT NULL AND job_project_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Não foi possível validar a campanha da entrega vinculada.';
  END IF;

  IF existing_project_id IS NULL THEN
    campaign_name := NULLIF(trim(p_name), '');
    IF campaign_name IS NULL THEN
      campaign_name := 'Campanha estratégica — ' || p_planning_month;
    END IF;

    INSERT INTO public.projects (
      name,
      client_id,
      status,
      type,
      owner_id
    )
    VALUES (
      campaign_name,
      action_client_id,
      'active',
      'special',
      auth.uid()
    )
    RETURNING id, name
      INTO existing_project_id, generated_project_name;
  END IF;

  UPDATE public.strategic_action_jobs
  SET project_id = existing_project_id
  WHERE id = existing_execution_id;

  RETURN QUERY SELECT
    existing_execution_id,
    existing_project_id,
    generated_project_name;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_strategic_monthly_campaign(uuid, text, text)
  TO authenticated;
