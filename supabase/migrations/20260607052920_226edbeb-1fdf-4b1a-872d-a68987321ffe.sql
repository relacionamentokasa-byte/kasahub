-- Limpeza de jobs sem vínculos obrigatórios para permitir NOT NULL
DELETE FROM public.jobs 
WHERE client_id IS NULL 
   OR project_id IS NULL 
   OR service_id IS NULL 
   OR contract_id IS NULL;

-- Aplicar NOT NULL
ALTER TABLE public.jobs ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN service_id SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN contract_id SET NOT NULL;

-- Garantir Foreign Keys
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'jobs_service_id_fkey') THEN
        ALTER TABLE public.jobs ADD CONSTRAINT jobs_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
