ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plain_password TEXT;

-- Drop and recreate the view to change column order safely
DROP VIEW IF EXISTS public.profiles_with_email;

CREATE OR REPLACE VIEW public.profiles_with_email AS
 SELECT p.id,
    p.full_name,
    p.display_name,
    p.avatar_url,
    p.job_title,
    p.phone,
    p.created_at,
    p.updated_at,
    p.custom_role_id,
    p.agency_logo_url,
    p.google_calendar_connected,
    p.google_calendar_id,
    p.google_refresh_token,
    p.department,
    p.status,
    p.last_access,
    p.plain_password,
    u.email
   FROM (profiles p
     LEFT JOIN auth.users u ON ((p.id = u.id)));
     
GRANT SELECT ON public.profiles_with_email TO authenticated;
GRANT SELECT ON public.profiles_with_email TO service_role;
