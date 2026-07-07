
-- 1) lead_sources: remove política anon ampla e cria view segura para landing pública
DROP POLICY IF EXISTS "Anon reads active lead sources (safe columns)" ON public.lead_sources;

DROP VIEW IF EXISTS public.lead_sources_public;
CREATE VIEW public.lead_sources_public
WITH (security_invoker = on) AS
SELECT
  id,
  name,
  slug,
  is_active,
  landing_headline,
  landing_subheadline,
  landing_description,
  landing_cta_label,
  landing_logo_url,
  landing_hero_image_url,
  landing_bg_color,
  landing_accent_color,
  landing_benefits,
  landing_testimonials,
  landing_form_fields,
  landing_success_message,
  landing_redirect_url,
  pixel_meta_id,
  gtag_id
FROM public.lead_sources
WHERE is_active = true;

GRANT SELECT ON public.lead_sources_public TO anon, authenticated;

-- Permite que a view (security_invoker) leia as colunas seguras da base para anon.
-- Sem RLS policy TO anon, a view seguiria bloqueando. Criamos policy restrita
-- apenas para leitura via view (as colunas sensíveis nunca são projetadas).
CREATE POLICY "Anon reads active lead sources via view"
ON public.lead_sources
FOR SELECT
TO anon
USING (is_active = true);

-- Revoga qualquer SELECT direto de colunas sensíveis para anon
REVOKE SELECT ON public.lead_sources FROM anon;
GRANT SELECT (
  id, name, slug, is_active,
  landing_headline, landing_subheadline, landing_description,
  landing_cta_label, landing_logo_url, landing_hero_image_url,
  landing_bg_color, landing_accent_color,
  landing_benefits, landing_testimonials, landing_form_fields,
  landing_success_message, landing_redirect_url,
  pixel_meta_id, gtag_id
) ON public.lead_sources TO anon;

-- 2) lead_tasks: restringe a membros da equipe
DROP POLICY IF EXISTS "Auth read lead tasks" ON public.lead_tasks;
DROP POLICY IF EXISTS "Auth insert lead tasks" ON public.lead_tasks;
DROP POLICY IF EXISTS "Auth update lead tasks" ON public.lead_tasks;
DROP POLICY IF EXISTS "Auth delete lead tasks" ON public.lead_tasks;

CREATE POLICY "Team reads lead tasks"
ON public.lead_tasks FOR SELECT TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team inserts lead tasks"
ON public.lead_tasks FOR INSERT TO authenticated
WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team updates lead tasks"
ON public.lead_tasks FOR UPDATE TO authenticated
USING (public.is_team_member(auth.uid()))
WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team deletes lead tasks"
ON public.lead_tasks FOR DELETE TO authenticated
USING (public.is_team_member(auth.uid()));
