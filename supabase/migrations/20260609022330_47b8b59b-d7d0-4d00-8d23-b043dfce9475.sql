ALTER TABLE public.agency_settings 
ADD COLUMN IF NOT EXISTS logo_white_url TEXT,
ADD COLUMN IF NOT EXISTS logo_black_url TEXT,
ADD COLUMN IF NOT EXISTS logo_yellow_url TEXT;

COMMENT ON COLUMN public.agency_settings.logo_white_url IS 'URL da logo branca para fundos escuros';
COMMENT ON COLUMN public.agency_settings.logo_black_url IS 'URL da logo preta para fundos claros';
COMMENT ON COLUMN public.agency_settings.logo_yellow_url IS 'URL da logo amarela para loading e favicon';