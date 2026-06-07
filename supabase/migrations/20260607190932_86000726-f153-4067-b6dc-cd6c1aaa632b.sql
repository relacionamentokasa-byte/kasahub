ALTER TABLE public.job_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.job_comments ADD COLUMN IF NOT EXISTS previous_versions JSONB DEFAULT '[]'::jsonb;

-- Ensure permissions are set (though usually they are inherited if RLS and grants already exist on the table)
GRANT ALL ON public.job_comments TO authenticated;
GRANT ALL ON public.job_comments TO service_role;
