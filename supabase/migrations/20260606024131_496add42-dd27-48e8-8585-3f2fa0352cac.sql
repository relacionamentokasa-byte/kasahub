ALTER TABLE public.jobs ADD COLUMN job_type TEXT;
COMMENT ON COLUMN public.jobs.job_type IS 'Categorização do job: post, video, design, landing_page, site, fachada, campanha, publicacao, desenvolvimento';
