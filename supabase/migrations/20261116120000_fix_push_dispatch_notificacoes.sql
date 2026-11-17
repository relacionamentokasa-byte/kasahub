CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.fn_dispatch_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := COALESCE(
      NULLIF(current_setting('app.push_dispatch_url', true), ''),
      'https://kasahub.lovable.app/api/public/hooks/dispatch-push'
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push dispatch request failed for notification %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_push ON public.notifications;
DROP TRIGGER IF EXISTS trg_dispatch_push_notificacoes ON public.notificacoes;

CREATE TRIGGER trg_dispatch_push_notificacoes
AFTER INSERT ON public.notificacoes
FOR EACH ROW
EXECUTE FUNCTION public.fn_dispatch_push_on_notification();

-- Optional override for a custom production domain:
-- ALTER DATABASE postgres SET app.push_dispatch_url = 'https://your-production-domain/api/public/hooks/dispatch-push';

COMMENT ON FUNCTION public.fn_dispatch_push_on_notification() IS
  'Asynchronously dispatches fresh public.notificacoes rows to the configured Web Push endpoint.';

COMMENT ON TRIGGER trg_dispatch_push_notificacoes ON public.notificacoes IS
  'Dispatches Web Push after a notification is inserted.';

DO $$
BEGIN
  IF current_setting('app.push_dispatch_url', true) IS NULL OR current_setting('app.push_dispatch_url', true) = '' THEN
    RAISE WARNING 'app.push_dispatch_url is not configured; push dispatch will fail until the production endpoint is set.';
  END IF;
END;
$$;

-- The historical trigger targeted public.notifications, while the application writes public.notificacoes.
-- The trigger above is intentionally attached only to the latter to prevent duplicate or missing pushes.
