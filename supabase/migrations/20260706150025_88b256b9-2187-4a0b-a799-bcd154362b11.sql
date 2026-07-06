
-- 1) contact_status on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_status text;

-- 2) follow_up_days on lead_stages
ALTER TABLE public.lead_stages
  ADD COLUMN IF NOT EXISTS follow_up_days integer;

-- Seed sensible defaults for existing non-won/non-lost stages
UPDATE public.lead_stages
   SET follow_up_days = 3
 WHERE follow_up_days IS NULL
   AND is_won = false
   AND is_lost = false;

-- 3) lead_tasks table
CREATE TABLE IF NOT EXISTS public.lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'follow_up',
  due_date timestamptz,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  created_by uuid,
  completed_at timestamptz,
  auto_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_tasks TO authenticated;
GRANT ALL ON public.lead_tasks TO service_role;

ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can manage lead tasks" ON public.lead_tasks;
CREATE POLICY "Authenticated can manage lead tasks"
  ON public.lead_tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON public.lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned_to ON public.lead_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_due_status ON public.lead_tasks(status, due_date);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_lead_tasks_updated_at ON public.lead_tasks;
CREATE TRIGGER update_lead_tasks_updated_at
  BEFORE UPDATE ON public.lead_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Auto follow-up trigger on stage entry
CREATE OR REPLACE FUNCTION public.fn_lead_auto_followup()
RETURNS TRIGGER AS $$
DECLARE
  v_days integer;
  v_stage_name text;
BEGIN
  IF NEW.stage_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only fire on INSERT or when stage_id changes
  IF TG_OP = 'UPDATE' AND OLD.stage_id IS NOT DISTINCT FROM NEW.stage_id THEN
    RETURN NEW;
  END IF;

  SELECT follow_up_days, name
    INTO v_days, v_stage_name
    FROM public.lead_stages
   WHERE id = NEW.stage_id;

  IF v_days IS NULL OR v_days <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.lead_tasks (
    lead_id, title, description, type, due_date, assigned_to, auto_generated
  ) VALUES (
    NEW.id,
    'Fazer follow-up · ' || v_stage_name,
    'Follow-up automático criado ao entrar na etapa "' || v_stage_name || '".',
    'follow_up',
    (now() + make_interval(days => v_days)),
    NEW.owner_id,
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_lead_auto_followup ON public.leads;
CREATE TRIGGER trg_lead_auto_followup
  AFTER INSERT OR UPDATE OF stage_id ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_lead_auto_followup();
