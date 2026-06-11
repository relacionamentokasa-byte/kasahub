-- Add kind and is_recurring columns to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;

-- Sync existing 'type' column to 'kind' if kind is empty
UPDATE public.transactions SET kind = type WHERE kind IS NULL AND type IS NOT NULL;

-- Grant permissions (standard procedure for Lovable migrations)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
