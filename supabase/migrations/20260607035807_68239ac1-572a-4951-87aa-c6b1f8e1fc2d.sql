-- 1. Remover gatilho e função problemáticos
DROP TRIGGER IF EXISTS tr_automate_contract_setup ON public.contracts;
DROP FUNCTION IF EXISTS public.automate_contract_setup();

-- 2. Remover tabelas residuais de fluxos
DROP TABLE IF EXISTS public.operational_flow_checklists;
DROP TABLE IF EXISTS public.operational_flow_jobs;
DROP TABLE IF EXISTS public.operational_flow_stages;
DROP TABLE IF EXISTS public.operational_flows;

-- 3. Limpar colunas obsoletas
ALTER TABLE public.services DROP COLUMN IF EXISTS operational_flow_id;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS flow_job_id;

-- 4. Atualizar service_job_templates para suportar Templates Operacionais
ALTER TABLE public.service_job_templates 
ADD COLUMN IF NOT EXISTS operational_template_id UUID REFERENCES public.operational_templates(id) ON DELETE SET NULL;

-- 5. Garantir permissões (boas práticas)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_job_templates TO authenticated;
GRANT ALL ON public.service_job_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_job_checklist TO authenticated;
GRANT ALL ON public.service_job_checklist TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_templates TO authenticated;
GRANT ALL ON public.operational_templates TO service_role;
