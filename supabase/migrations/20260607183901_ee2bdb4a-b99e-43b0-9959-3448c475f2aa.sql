ALTER TABLE public.projects ADD COLUMN total_jobs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN completed_jobs INTEGER NOT NULL DEFAULT 0;

-- Populate existing data
UPDATE public.projects p
SET total_jobs = (
  SELECT COUNT(*) FROM public.jobs j WHERE j.project_id = p.id
),
completed_jobs = (
  SELECT COUNT(*) FROM public.jobs j 
  WHERE j.project_id = p.id 
  AND (j.done_at IS NOT NULL OR j.stage_id IN (SELECT id FROM public.job_stages WHERE is_done = true))
);

-- Note: We could add triggers here but since I need to fix the UI too, 
-- I'll first ensure the schema exists and then update the code.
GRANT SELECT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;