ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS custom_fields_schema JSONB DEFAULT '[]'::jsonb;

-- Ensure service_role has access (standard for this project)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
