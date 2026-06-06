
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.fn_dispatch_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://project--621e80b6-8687-4e83-b76c-8896600eb296.lovable.app/api/public/hooks/dispatch-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- never block the insert if push dispatch fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_push ON public.notifications;
CREATE TRIGGER trg_dispatch_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.fn_dispatch_push_on_notification();
