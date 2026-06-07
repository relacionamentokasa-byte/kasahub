-- 1. Remover as Foreign Keys que apontam para operational_templates
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_operational_template_id_fkey;
ALTER TABLE public.service_job_templates DROP CONSTRAINT IF EXISTS service_job_templates_operational_template_id_fkey;

-- 2. Limpar os dados nas colunas de referência
UPDATE public.jobs SET operational_template_id = NULL;
UPDATE public.service_job_templates SET operational_template_id = NULL;

-- 3. Remover a tabela de templates operacionais
DROP TABLE IF EXISTS public.operational_templates;

-- 4. Remover as colunas de referência (Opcional, mas recomendado para limpeza definitiva)
-- Se você quiser manter as colunas para evitar erros de tipo até o próximo build, pule este passo.
-- Mas o usuário pediu para "excluir os templates operacionais" definitivamente.
ALTER TABLE public.jobs DROP COLUMN IF EXISTS operational_template_id;
ALTER TABLE public.service_job_templates DROP COLUMN IF EXISTS operational_template_id;
