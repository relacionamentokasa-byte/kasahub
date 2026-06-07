-- 1. Ensure custom_fields_schema exists on jobs (Already added, but for consistency)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS custom_fields_schema JSONB DEFAULT '[]'::jsonb;

-- 2. Add custom_fields_schema to service_job_templates
ALTER TABLE public.service_job_templates ADD COLUMN IF NOT EXISTS custom_fields_schema JSONB DEFAULT '[]'::jsonb;

-- 3. Update operational_flow_jobs just in case it's still used by some legacy trigger (though we are moving away from it)
ALTER TABLE public.operational_flow_jobs ADD COLUMN IF NOT EXISTS custom_fields_schema JSONB DEFAULT '[]'::jsonb;

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_job_templates TO authenticated;
GRANT ALL ON public.service_job_templates TO service_role;
