ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS contract_term TEXT,
ADD COLUMN IF NOT EXISTS installments INTEGER;

COMMENT ON COLUMN public.proposals.contract_term IS 'Term of the contract: monthly (no end date), 3_months, 6_months, 12_months, or custom';
COMMENT ON COLUMN public.proposals.installments IS 'Number of installments for one-time jobs';