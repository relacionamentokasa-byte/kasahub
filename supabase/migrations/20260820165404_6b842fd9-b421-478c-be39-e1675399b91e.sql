
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS financial_collection_status TEXT NOT NULL DEFAULT 'active' CHECK (financial_collection_status IN ('active', 'suspended')),
ADD COLUMN IF NOT EXISTS financial_collection_date TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS financial_collection_reason TEXT NULL;

COMMENT ON COLUMN public.clients.financial_collection_status IS 'Status de cobrança financeira: active ou suspended';
COMMENT ON COLUMN public.clients.financial_collection_date IS 'Data em que a cobrança foi suspensa';
COMMENT ON COLUMN public.clients.financial_collection_reason IS 'Motivo da suspensão da cobrança';
