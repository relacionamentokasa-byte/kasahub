-- Tornar client_id obrigatório em projects
ALTER TABLE public.projects ALTER COLUMN client_id SET NOT NULL;

-- Tornar projeto_id obrigatório em jobs
ALTER TABLE public.jobs ALTER COLUMN project_id SET NOT NULL;

-- Adicionar FK com DELETE CASCADE para jobs -> projects
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_project_id_fkey;
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_project_id_fkey 
FOREIGN KEY (project_id) 
REFERENCES public.projects(id) 
ON DELETE CASCADE;

-- Adicionar FK com DELETE CASCADE para projects -> clients
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
ALTER TABLE public.projects 
ADD CONSTRAINT projects_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- Garantir que todos os jobs tenham client_id vindo do projeto se estiver nulo (migração de dados se necessário)
UPDATE public.jobs j
SET client_id = p.client_id
FROM public.projects p
WHERE j.project_id = p.id AND j.client_id IS NULL;

-- Tornar client_id em jobs NOT NULL (opcional, já que projeto_id já é NOT NULL e o projeto tem o client_id)
-- Mas o usuário pediu que projeto_id seja o container.
ALTER TABLE public.jobs ALTER COLUMN client_id SET NOT NULL;

-- Re-garantir permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
