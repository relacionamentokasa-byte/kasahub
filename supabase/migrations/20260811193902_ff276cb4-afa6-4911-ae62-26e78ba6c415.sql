ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS is_special_negotiation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_installments_config JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.proposals.payment_installments_config IS 'Lista de parcelas: {percent, due_kind, due_date, value}';
