-- Add new columns to contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS total_value NUMERIC;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS service_ids UUID[] DEFAULT '{}';

-- Types for contract type: 'recurring', 'one_time', 'special_project', 'consultancy'
-- We can use check constraint if we want, but let's keep it flexible for now.

-- Grant permissions (just in case they were missing for the new columns)
GRANT ALL ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
