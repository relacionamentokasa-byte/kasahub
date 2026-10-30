ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS notes TEXT;
COMMENT ON COLUMN public.contracts.notes IS 'JSON com a lista de aditivos aplicados ao contrato';