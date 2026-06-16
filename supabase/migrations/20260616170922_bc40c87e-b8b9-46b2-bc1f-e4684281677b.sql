
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_primary_color TEXT,
  ADD COLUMN IF NOT EXISTS portal_cover_color TEXT;
