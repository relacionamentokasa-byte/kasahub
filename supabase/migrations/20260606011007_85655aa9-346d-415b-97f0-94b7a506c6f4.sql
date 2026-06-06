-- Add origin column
ALTER TABLE public.extra_demands ADD COLUMN origin TEXT DEFAULT 'contract' CHECK (origin IN ('contract', 'independent'));

-- Make contract_id nullable if it's not already (it should be, but let's be sure)
ALTER TABLE public.extra_demands ALTER COLUMN contract_id DROP NOT NULL;

-- Add flag for alert dismissal
ALTER TABLE public.extra_demands ADD COLUMN conversion_alert_dismissed BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.extra_demands.origin IS 'Origin of the demand: contract (linked) or independent';

-- Update existing data to have 'contract' origin where contract_id is set
UPDATE public.extra_demands SET origin = 'contract' WHERE contract_id IS NOT NULL;
UPDATE public.extra_demands SET origin = 'independent' WHERE contract_id IS NULL;

-- Ensure service_role has access to new columns
GRANT ALL ON public.extra_demands TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extra_demands TO authenticated;