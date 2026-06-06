
ALTER TABLE public.agency_settings
  ADD COLUMN IF NOT EXISTS pwa_name TEXT,
  ADD COLUMN IF NOT EXISTS pwa_short_name TEXT,
  ADD COLUMN IF NOT EXISTS pwa_description TEXT,
  ADD COLUMN IF NOT EXISTS pwa_theme_color TEXT,
  ADD COLUMN IF NOT EXISTS pwa_background_color TEXT,
  ADD COLUMN IF NOT EXISTS pwa_icon_192_url TEXT,
  ADD COLUMN IF NOT EXISTS pwa_icon_512_url TEXT,
  ADD COLUMN IF NOT EXISTS pwa_favicon_url TEXT;
