-- Restrict anon column access on lead_sources to public landing page fields only.
REVOKE SELECT ON public.lead_sources FROM anon;

GRANT SELECT (
  id, name, slug, is_active, default_stage_id,
  landing_headline, landing_subheadline, landing_description,
  landing_cta_label, landing_logo_url, landing_hero_image_url,
  landing_bg_color, landing_accent_color, landing_benefits,
  landing_testimonials, landing_form_fields, landing_success_message,
  landing_redirect_url, created_at, updated_at
) ON public.lead_sources TO anon;