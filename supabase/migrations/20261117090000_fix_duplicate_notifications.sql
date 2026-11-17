-- Remove duplicate notification paths created by migrations with different trigger names.
DROP TRIGGER IF EXISTS on_job_assignment ON public.jobs;
DROP TRIGGER IF EXISTS tr_job_assignment_notification ON public.jobs;
DROP TRIGGER IF EXISTS on_job_status_change ON public.jobs;
DROP TRIGGER IF EXISTS tr_job_status_notification ON public.jobs;
DROP TRIGGER IF EXISTS on_job_comment ON public.job_comments;
DROP TRIGGER IF EXISTS tr_job_comment_notification ON public.job_comments;

-- Keep one trigger for each job notification event. The functions are the latest
-- definitions already present in the database.
CREATE TRIGGER tr_job_assignment_notification
AFTER INSERT OR UPDATE OF assignee_id, main_responsible_id, team_involved ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.handle_job_assignment_notification();

CREATE TRIGGER tr_job_status_notification
AFTER UPDATE OF status ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.handle_job_status_notification();

CREATE TRIGGER tr_job_comment_notification
AFTER INSERT ON public.job_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_job_comment_notification();

-- Make repeated calls for the same event safe. Different users can still receive
-- the same event because user_id remains part of the identity check.
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_type text DEFAULT 'info',
  p_category text DEFAULT 'general',
  p_link text DEFAULT NULL,
  p_origin_type text DEFAULT NULL,
  p_origin_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_origin_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.notifications
       WHERE user_id = p_user_id
         AND origin_type = p_origin_type
         AND origin_id = p_origin_id
         AND title = p_title
         AND description IS NOT DISTINCT FROM p_description
         AND created_at >= now() - INTERVAL '1 day'
     ) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    description,
    type,
    category,
    link,
    origin_type,
    origin_id,
    metadata,
    is_read,
    is_archived,
    created_at
  ) VALUES (
    p_user_id,
    p_title,
    p_description,
    p_type,
    p_category,
    p_link,
    p_origin_type,
    p_origin_id,
    p_metadata,
    false,
    false,
    now()
  );
END;
$$;

-- Prevent concurrent morning-summary and lead-task-reminder requests from
-- inserting duplicate rows in the legacy notification table.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_daily_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF NEW.tipo = 'morning_summary' THEN
    v_key := NEW.user_id::text || ':morning_summary:' || (now() AT TIME ZONE 'UTC')::date::text;
    PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

    IF EXISTS (
      SELECT 1
      FROM public.notificacoes
      WHERE user_id = NEW.user_id
        AND tipo = 'morning_summary'
        AND created_at >= date_trunc('day', now())
    ) THEN
      RETURN NULL;
    END IF;
  ELSIF NEW.tipo = 'lead_task' AND NEW.link IS NOT NULL THEN
    v_key := NEW.user_id::text || ':lead_task:' || NEW.link;
    PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

    IF EXISTS (
      SELECT 1
      FROM public.notificacoes
      WHERE user_id = NEW.user_id
        AND tipo = 'lead_task'
        AND link = NEW.link
        AND created_at >= date_trunc('day', now())
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_daily_notification ON public.notificacoes;
CREATE TRIGGER trg_prevent_duplicate_daily_notification
BEFORE INSERT ON public.notificacoes
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_daily_notification();

-- Make the upcoming-job deadline check safe when called repeatedly.
CREATE OR REPLACE FUNCTION public.check_upcoming_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tomorrow date := CURRENT_DATE + 1;
  v_job record;
BEGIN
  FOR v_job IN
    SELECT id, title, assignee_id
    FROM public.jobs
    WHERE due_date = v_tomorrow
      AND done_at IS NULL
      AND COALESCE(status, '') <> 'done'
      AND assignee_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = public.jobs.assignee_id
          AND n.origin_type = 'jobs'
          AND n.origin_id = public.jobs.id
          AND n.title = 'Prazo Próximo'
          AND n.created_at >= date_trunc('day', now())
      )
  LOOP
    PERFORM public.notify_user(
      v_job.assignee_id,
      'Prazo Próximo',
      'O job "' || v_job.title || '" vence amanhã!',
      'alert',
      'agenda',
      '/jobs?jobId=' || v_job.id,
      'jobs',
      v_job.id,
      NULL
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, text, text, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prevent_duplicate_daily_notification() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_upcoming_deadlines() TO authenticated, service_role;
