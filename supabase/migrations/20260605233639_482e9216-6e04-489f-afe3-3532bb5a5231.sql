ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS structure_status TEXT;

COMMENT ON COLUMN public.proposals.cancelled_at IS 'Data e hora do cancelamento da proposta.';
COMMENT ON COLUMN public.proposals.structure_status IS 'Status da estrutura operacional vinculada (ex: removed).';