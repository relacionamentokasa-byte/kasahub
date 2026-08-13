ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS nf_status TEXT DEFAULT 'pendente' CHECK (nf_status IN ('pendente', 'emitida', 'nao_necessaria')),
ADD COLUMN IF NOT EXISTS boleto_internal_status TEXT DEFAULT 'nao_se_aplica' CHECK (boleto_internal_status IN ('pendente', 'emitido', 'nao_se_aplica'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
