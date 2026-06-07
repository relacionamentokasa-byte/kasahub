ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS custom_fields_schema JSONB DEFAULT '[]'::jsonb;
GRANT ALL ON public.jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
