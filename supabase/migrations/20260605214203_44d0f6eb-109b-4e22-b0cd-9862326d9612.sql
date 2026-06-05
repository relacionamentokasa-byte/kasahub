ALTER TABLE public.services ADD COLUMN default_scope JSONB DEFAULT '[]'::jsonb;

-- Grant permissions (standard procedure)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;