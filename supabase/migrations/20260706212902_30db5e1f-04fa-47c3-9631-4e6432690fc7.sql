
-- 1) Notify when a lead task is assigned (INSERT with assigned_to, or UPDATE changing assigned_to)
CREATE OR REPLACE FUNCTION public.fn_notify_lead_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_name text;
  v_due text;
  v_actor uuid := auth.uid();
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  -- Do not spam the actor themselves
  IF NEW.assigned_to = v_actor THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_lead_name FROM public.leads WHERE id = NEW.lead_id;
  v_due := CASE
    WHEN NEW.due_date IS NULL THEN 'sem prazo'
    ELSE 'para ' || to_char(NEW.due_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')
  END;

  INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
  VALUES (
    NEW.assigned_to,
    'Nova tarefa de follow-up',
    NEW.title || ' · ' || COALESCE(v_lead_name, 'Lead') || ' (' || v_due || ')',
    'lead_task',
    '/crm?leadId=' || NEW.lead_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_task_assignment ON public.lead_tasks;
CREATE TRIGGER trg_notify_lead_task_assignment
AFTER INSERT OR UPDATE OF assigned_to ON public.lead_tasks
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_lead_task_assignment();
