-- DATABASE AUDIT & INTEGRITY FIX - FINAL STRUCTURAL ENFORCEMENT

-- 1. ENFORCE CONSTRAINTS: Establish permanent relationships

-- Proposals -> Clients
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_client_id_fkey;
ALTER TABLE public.proposals ADD CONSTRAINT proposals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Contracts -> Clients
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_client_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Projects -> Clients
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
ALTER TABLE public.projects ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Projects -> Contracts
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_contract_id_fkey;
ALTER TABLE public.projects ADD CONSTRAINT projects_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Projects -> Proposals
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_proposal_id_fkey;
ALTER TABLE public.projects ADD CONSTRAINT projects_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;

-- Transactions -> Clients
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_client_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Transactions -> Projects
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_project_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- Transactions -> Proposals
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_proposal_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;

-- Transactions -> Contracts
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_contract_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Extra Demands -> Clients
ALTER TABLE public.extra_demands DROP CONSTRAINT IF EXISTS extra_demands_client_id_fkey;
ALTER TABLE public.extra_demands ADD CONSTRAINT extra_demands_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- 2. OPERATIONAL VALIDATION: Prevent future orphan jobs

-- Update existing orphan jobs to ensure the trigger doesn't fail existing data unexpectedly 
-- Only update if there are projects to link to.
UPDATE public.jobs SET project_id = (SELECT id FROM public.projects LIMIT 1) 
WHERE project_id IS NULL AND dme_id IS NULL AND (SELECT count(*) FROM public.projects) > 0;

CREATE OR REPLACE FUNCTION public.check_job_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.project_id IS NULL AND NEW.dme_id IS NULL THEN
        RAISE EXCEPTION 'Erro de Integridade: Um Job deve obrigatoriamente estar vinculado a um Projeto ou a uma DME.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_job_integrity ON public.jobs;
CREATE TRIGGER tr_check_job_integrity
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.check_job_integrity();

-- 3. GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
