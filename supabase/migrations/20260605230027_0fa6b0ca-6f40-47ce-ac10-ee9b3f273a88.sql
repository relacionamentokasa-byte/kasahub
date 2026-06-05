ALTER TABLE public.proposals ADD COLUMN notes TEXT;
COMMENT ON COLUMN public.proposals.notes IS 'Observações internas da proposta';