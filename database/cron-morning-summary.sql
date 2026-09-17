-- Agendamento do Resumo Matinal Geral KASA HUB via pg_cron & pg_net
-- Dispara de segunda a sexta-feira às 08h30 (Horário de Brasília / UTC-3 -> 11h30 UTC)

-- 1. Habilitar extensões necessárias (se ainda não habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remover agendamento anterior caso exista para evitar duplicatas
SELECT cron.unschedule('kasa-morning-summary') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'kasa-morning-summary'
);

-- 3. Criar função para acionar o webhook
CREATE OR REPLACE FUNCTION trigger_kasa_morning_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url text;
BEGIN
  -- URL base da aplicação (substitua pelo domínio de produção se aplicável)
  app_url := COALESCE(current_setting('app.settings.service_url', true), 'https://kasahub.app');

  PERFORM net.http_post(
    url := app_url || '/api/public/hooks/morning-summary',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
END;
$$;

-- 4. Agendar job para 11:30 UTC (08:30 BRT) de segunda a sexta (1-5)
SELECT cron.schedule(
  'kasa-morning-summary',
  '30 11 * * 1-5',
  $$SELECT trigger_kasa_morning_summary();$$
);
