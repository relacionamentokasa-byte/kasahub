ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS video_concept TEXT;
COMMENT ON COLUMN public.scripts.video_concept IS 'Concept or creative direction for the video';
