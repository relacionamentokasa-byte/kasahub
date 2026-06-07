-- 1. Remover tabelas de templates de jobs
DROP TABLE IF EXISTS public.service_job_checklist CASCADE;
DROP TABLE IF EXISTS public.service_job_templates CASCADE;

-- 2. Remover colunas legadas em propostas
ALTER TABLE public.proposals DROP COLUMN IF EXISTS operational_id;

-- 3. Remover colunas legadas em itens de proposta
ALTER TABLE public.proposal_items DROP COLUMN IF EXISTS job_template;

-- 4. Remover colunas legadas em jobs
ALTER TABLE public.jobs DROP COLUMN IF EXISTS operational_template_id;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS job_template_id;

-- 5. Remover triggers ou funções de automação que possam estar criando jobs automaticamente (se existirem)
-- (Verificamos antes e não encontramos triggers explícitas de criação de job, mas por segurança limpamos referências)

-- 6. Garantir que a tabela de serviços não tenha referências a fluxos operacionais (já removida anteriormente, mas reforçamos)
ALTER TABLE public.services DROP COLUMN IF EXISTS operational_flow_id;
