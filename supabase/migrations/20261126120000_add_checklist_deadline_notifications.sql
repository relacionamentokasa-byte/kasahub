-- Keep deadline reminders in the notification stream consumed by the app and push dispatcher.
ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_dedupe_key_uidx
  ON public.notificacoes (dedupe_key);

CREATE OR REPLACE FUNCTION public.check_upcoming_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_date date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 1);
  v_target_date_text text := to_char(v_target_date, 'YYYY-MM-DD');
BEGIN
  INSERT INTO public.notificacoes (
    user_id,
    titulo,
    mensagem,
    tipo,
    link,
    dedupe_key
  )
  SELECT
    COALESCE(j.main_responsible_id, j.assignee_id),
    'Prazo próximo',
    'O job "' || j.title || '" vence amanhã (' || to_char(v_target_date, 'DD/MM/YYYY') || ').',
    'alert',
    '/jobs?jobId=' || j.id,
    'deadline:job:' || j.id || ':' || v_target_date_text || ':' || COALESCE(j.main_responsible_id, j.assignee_id)::text
  FROM public.jobs j
  LEFT JOIN public.job_stages st ON st.id = j.stage_id
  WHERE j.due_date = v_target_date
    AND j.done_at IS NULL
    AND COALESCE(j.status, '') <> 'done'
    AND COALESCE(st.is_done, false) = false
    AND COALESCE(btrim(j.title), '') <> ''
    AND COALESCE(j.main_responsible_id, j.assignee_id) IS NOT NULL
  ON CONFLICT (dedupe_key) DO NOTHING;

  INSERT INTO public.notificacoes (
    user_id,
    titulo,
    mensagem,
    tipo,
    link,
    dedupe_key
  )
  SELECT
    jc.responsible_id,
    'Prazo de etapa próximo',
    'A etapa "' || jc.content || '" do job "' || j.title || '" vence amanhã (' || to_char(v_target_date, 'DD/MM/YYYY') || ').',
    'alert',
    '/jobs?jobId=' || j.id,
    'deadline:checklist:' || jc.id || ':' || v_target_date_text || ':' || jc.responsible_id
  FROM public.jobs j
  LEFT JOIN public.job_stages st ON st.id = j.stage_id
  CROSS JOIN LATERAL jsonb_each_text(
    CASE
      WHEN jsonb_typeof(j.custom_fields -> 'checklist_due_dates') = 'object'
        THEN j.custom_fields -> 'checklist_due_dates'
      ELSE '{}'::jsonb
    END
  ) AS due(item_id, item_due_date)
  JOIN public.job_checklist jc
    ON jc.id::text = due.item_id
   AND jc.job_id = j.id
  WHERE due.item_due_date = v_target_date_text
    AND jc.done = false
    AND jc.responsible_id IS NOT NULL
    AND j.done_at IS NULL
    AND COALESCE(j.status, '') <> 'done'
    AND COALESCE(st.is_done, false) = false
    AND COALESCE(btrim(j.title), '') <> ''
  ON CONFLICT (dedupe_key) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_upcoming_deadlines() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_upcoming_deadlines() TO service_role;

-- Keep the existing morning-summary schedule as the single daily trigger.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_kasa_morning_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_url text;
BEGIN
  BEGIN
    PERFORM public.check_upcoming_deadlines();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Falha ao gerar lembretes de prazo: %', SQLERRM;
  END;

  app_url := COALESCE(
    current_setting('app.settings.service_url', true),
    'https://kasahub.app'
  );

  PERFORM net.http_post(
    url := app_url || '/api/public/hooks/morning-summary',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'kasa-morning-summary') THEN
    PERFORM cron.unschedule('kasa-morning-summary');
  END IF;
END;
$$;

SELECT cron.schedule(
  'kasa-morning-summary',
  '30 11 * * 1-5',
  $$SELECT public.trigger_kasa_morning_summary();$$
);

GRANT EXECUTE ON FUNCTION public.trigger_kasa_morning_summary() TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_kasa_morning_summary() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.check_upcoming_deadlines() IS
  'Notifica prazos de jobs e etapas para o dia seguinte, com deduplicacao por evento e destinatario.';

-- The migration's own function definition remains the source of truth for the cron.
