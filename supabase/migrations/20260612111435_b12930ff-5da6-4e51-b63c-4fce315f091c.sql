ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS installments_count INTEGER,
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS service_ids UUID[],
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id);

COMMENT ON COLUMN public.contracts.installments_count IS 'Número total de parcelas ou meses do contrato';
COMMENT ON COLUMN public.contracts.type IS 'Tipo do contrato: recurring (recorrente) ou one_time (pontual)';
COMMENT ON COLUMN public.contracts.service_ids IS 'IDs dos serviços vinculados a este contrato';
