ALTER TABLE public.script_scenes
  ADD COLUMN IF NOT EXISTS reference_url text,
  ADD COLUMN IF NOT EXISTS reference_image_url text;