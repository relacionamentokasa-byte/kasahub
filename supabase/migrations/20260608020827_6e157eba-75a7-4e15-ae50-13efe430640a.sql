-- 1. Configure Email Queue Processor Cron
-- We use the published URL for the cron job to ensure it always points to the latest stable deployment.
-- Note: The route /lovable/email/queue/process is handled by the TanStack server.

SELECT cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://kasa-opus.lovable.app/lovable/email/queue/process',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body:='{}'
    ) as request_id;
  $$
);

-- 2. Configure Financial Health Notifications Cron
-- Runs every day at 00:00 (midnight)
SELECT cron.schedule(
  'financial-notifications-check',
  '0 0 * * *',
  $$
  SELECT public.check_financial_notifications();
  $$
);

-- Ensure service_role can run these (should be default for pg_cron)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
