DROP TRIGGER IF EXISTS tr_job_assignment_notification ON public.jobs;
DROP TRIGGER IF EXISTS on_job_status_change ON public.jobs;
DROP TRIGGER IF EXISTS on_job_comment ON public.job_comments;

ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_dedupe_key_uidx ON public.notificacoes (dedupe_key);

CREATE OR REPLACE FUNCTION public.is_lead_active(_lead_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads l
    LEFT JOIN public.lead_stages s ON s.id = l.stage_id
    WHERE l.id = _lead_id
      AND l.won_at IS NULL
      AND (l.lost_reason IS NULL OR btrim(l.lost_reason) = '')
      AND COALESCE(s.is_won, false) = false
      AND COALESCE(s.is_lost, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_notify_lead_task_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_lead_name text;
  v_due text;
  v_actor uuid := auth.uid();
BEGIN
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN RETURN NEW; END IF;
  IF NEW.assigned_to = v_actor THEN RETURN NEW; END IF;
  IF NOT public.is_lead_active(NEW.lead_id) THEN RETURN NEW; END IF;

  SELECT name INTO v_lead_name FROM public.leads WHERE id = NEW.lead_id;
  v_due := CASE WHEN NEW.due_date IS NULL THEN 'sem prazo'
    ELSE 'para ' || to_char(NEW.due_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM') END;

  INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
  VALUES (NEW.assigned_to, 'Nova tarefa de follow-up',
    NEW.title || ' · ' || COALESCE(v_lead_name, 'Lead') || ' (' || v_due || ')',
    'lead_task', '/crm?leadId=' || NEW.lead_id || '&taskId=' || NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_job_comment_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_author_name text;
  v_job_title text;
  v_assignee_id uuid;
BEGIN
  IF NEW.is_system THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, full_name, 'Alguém') INTO v_author_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT title, assignee_id INTO v_job_title, v_assignee_id FROM public.jobs WHERE id = NEW.job_id;
  IF v_assignee_id IS NOT NULL AND v_assignee_id IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
    VALUES (v_assignee_id, 'Novo Comentário',
      COALESCE(v_author_name, 'Alguém') || ' comentou no job: ' || COALESCE(v_job_title, ''),
      'comment', '/jobs?jobId=' || NEW.job_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_job_comment_notification: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_job_status_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_author_name text;
  v_status_label text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.assignee_id IS NULL OR NEW.assignee_id = auth.uid() THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, full_name, 'Alguém') INTO v_author_name FROM public.profiles WHERE id = auth.uid();
  v_status_label := CASE NEW.status
    WHEN 'not_started' THEN 'Nova Demanda' WHEN 'in_progress' THEN 'Em Andamento'
    WHEN 'review' THEN 'Em Revisão' WHEN 'done' THEN 'Concluído' WHEN 'paused' THEN 'Pausado'
    ELSE NEW.status END;
  INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
  VALUES (NEW.assignee_id, 'Mudança de Status',
    COALESCE(v_author_name, 'Alguém') || ' alterou o status do job "' || NEW.title || '" para: ' || v_status_label,
    'job', '/jobs?jobId=' || NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_job_status_notification: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_upcoming_deadlines()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_tomorrow date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 1);
  v_today text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');
BEGIN
  INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link, dedupe_key)
  SELECT j.assignee_id, 'Prazo Próximo',
         'O job "' || j.title || '" vence amanhã!', 'alert',
         '/jobs?jobId=' || j.id,
         'deadline:' || j.id || ':' || v_today
    FROM public.jobs j
    LEFT JOIN public.job_stages st ON st.id = j.stage_id
    JOIN public.profiles p ON p.id = j.assignee_id
   WHERE j.due_date = v_tomorrow
     AND j.done_at IS NULL
     AND COALESCE(j.status, '') <> 'done'
     AND COALESCE(st.is_done, false) = false
     AND COALESCE(btrim(j.title), '') <> ''
     AND (j.project_id IS NOT NULL OR j.dme_id IS NOT NULL OR j.launch_product_id IS NOT NULL)
  ON CONFLICT (dedupe_key) DO NOTHING;
END;
$function$;