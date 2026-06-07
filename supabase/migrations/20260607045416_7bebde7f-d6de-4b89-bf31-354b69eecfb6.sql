ALTER TABLE public.job_comments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'comment';
ALTER TABLE public.job_comments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.job_comments ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Grant permissions
GRANT ALL ON public.job_comments TO authenticated;
GRANT ALL ON public.job_comments TO service_role;
