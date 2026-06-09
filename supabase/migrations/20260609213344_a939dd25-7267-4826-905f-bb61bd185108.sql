ALTER TABLE public.job_checklist ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES public.profiles(id);
GRANT ALL ON public.job_checklist TO authenticated;
GRANT ALL ON public.job_checklist TO service_role;