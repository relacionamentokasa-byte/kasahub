-- Adicionar campos de briefing detalhado se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'briefing_objective') THEN
        ALTER TABLE public.jobs ADD COLUMN briefing_objective TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'briefing_guidelines') THEN
        ALTER TABLE public.jobs ADD COLUMN briefing_guidelines TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'briefing_references') THEN
        ALTER TABLE public.jobs ADD COLUMN briefing_references TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'briefing_notes') THEN
        ALTER TABLE public.jobs ADD COLUMN briefing_notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'custom_form_data') THEN
        ALTER TABLE public.jobs ADD COLUMN custom_form_data JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'custom_fields') THEN
        ALTER TABLE public.jobs ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Garantir que a tabela operational_flow_jobs tenha o esquema de campos personalizados
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'operational_flow_jobs' AND COLUMN_NAME = 'custom_fields_schema') THEN
        ALTER TABLE public.operational_flow_jobs ADD COLUMN custom_fields_schema JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Dar permissões para as novas colunas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_flow_jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
GRANT ALL ON public.operational_flow_jobs TO service_role;
