ALTER TABLE public.agency_settings 
ADD COLUMN IF NOT EXISTS logo_sidebar_url TEXT,
ADD COLUMN IF NOT EXISTS logo_login_url TEXT,
ADD COLUMN IF NOT EXISTS icon_system_url TEXT,
ADD COLUMN IF NOT EXISTS splash_screen_url TEXT,
ADD COLUMN IF NOT EXISTS logo_proposals_url TEXT,
ADD COLUMN IF NOT EXISTS logo_reports_url TEXT;

COMMENT ON COLUMN public.agency_settings.logo_url IS 'Logo Principal';
COMMENT ON COLUMN public.agency_settings.logo_sidebar_url IS 'Logo Menu Lateral';
COMMENT ON COLUMN public.agency_settings.logo_login_url IS 'Logo Tela de Login';
COMMENT ON COLUMN public.agency_settings.icon_system_url IS 'Ícone do Sistema';
COMMENT ON COLUMN public.agency_settings.pwa_favicon_url IS 'Favicon';
COMMENT ON COLUMN public.agency_settings.pwa_icon_192_url IS 'Ícone PWA (192px)';
COMMENT ON COLUMN public.agency_settings.pwa_icon_512_url IS 'Ícone PWA (512px)';
COMMENT ON COLUMN public.agency_settings.splash_screen_url IS 'Splash Screen';
COMMENT ON COLUMN public.agency_settings.logo_proposals_url IS 'Logo das Propostas';
COMMENT ON COLUMN public.agency_settings.agency_signature_url IS 'Assinatura da Empresa';
COMMENT ON COLUMN public.agency_settings.logo_reports_url IS 'Logo dos Relatórios';
