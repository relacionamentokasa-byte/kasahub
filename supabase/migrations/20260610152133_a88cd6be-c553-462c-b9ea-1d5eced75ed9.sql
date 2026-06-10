ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Como é um campo novo em uma tabela existente, garantimos que o service_role e usuários autenticados tenham acesso (assumindo que já existem políticas, mas por segurança para o novo campo se necessário)
-- Na verdade, ALTER TABLE não remove permissões, mas se houver SELECT explícito em políticas, pode ser necessário revisar.
-- Assumindo o padrão de permissão da tabela jobs.
