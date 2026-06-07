-- Adicionar coluna para observações operacionais
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS operational_observations TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.jobs.operational_observations IS 'Registros internos da equipe sobre a execução do job';

-- Grant permissions (just in case)
GRANT ALL ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
