
-- 1) agency_goals
DROP POLICY IF EXISTS "Users can view all agency goals" ON public.agency_goals;
CREATE POLICY "Team can view agency goals" ON public.agency_goals
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

-- 2) categorias_financeiras
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categorias_financeiras;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categorias_financeiras;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categorias_financeiras;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categorias_financeiras;
CREATE POLICY "Team manages categorias_financeiras" ON public.categorias_financeiras
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- 3) contas_bancarias
DROP POLICY IF EXISTS "Authenticated users can view contas" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Authenticated users can insert contas" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Authenticated users can update contas" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Authenticated users can delete contas" ON public.contas_bancarias;
CREATE POLICY "Team manages contas_bancarias" ON public.contas_bancarias
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- 4) contracts
DROP POLICY IF EXISTS "Users can manage contracts" ON public.contracts;
CREATE POLICY "Team manages contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- 5) transactions
DROP POLICY IF EXISTS "Users can manage transactions" ON public.transactions;
CREATE POLICY "Team manages transactions" ON public.transactions
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- 6) dme_batches / dme_batch_items — remove anon access (moved to server route w/ service role)
DROP POLICY IF EXISTS "Public can read batches by token" ON public.dme_batches;
DROP POLICY IF EXISTS "Public can update approval fields" ON public.dme_batches;
DROP POLICY IF EXISTS "Public can read batch items" ON public.dme_batch_items;

-- 7) job_checklist — scope portal users, restrict writes to team
DROP POLICY IF EXISTS "Authenticated users can update checklist items" ON public.job_checklist;
DROP POLICY IF EXISTS "Team can manage checklist" ON public.job_checklist;
CREATE POLICY "Team manages job checklist" ON public.job_checklist
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Portal users read their job checklist" ON public.job_checklist
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.clients c ON c.id = j.client_id
    WHERE j.id = job_checklist.job_id AND c.portal_user_id = auth.uid()
  ));

-- 8) job_comments — exclude internal comments from portal users
DROP POLICY IF EXISTS "Portal users read their job comments" ON public.job_comments;
CREATE POLICY "Portal users read their job comments" ON public.job_comments
  FOR SELECT TO authenticated
  USING (
    NOT COALESCE(is_internal, false)
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.clients c ON c.id = j.client_id
      WHERE j.id = job_comments.job_id AND c.portal_user_id = auth.uid()
    )
  );

-- 9) lead_sources — restrict anon to landing-safe columns only (hide secret etc.)
DROP POLICY IF EXISTS "Anyone can read active lead sources" ON public.lead_sources;
CREATE POLICY "Anon reads active lead source landing fields" ON public.lead_sources
  FOR SELECT TO anon USING (is_active = true);

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

-- 10) Signatures bucket — drop public read policy
DROP POLICY IF EXISTS "Signatures: leitura pública" ON storage.objects;

-- 11) Revoke EXECUTE from anon/public on SECURITY DEFINER functions not meant to be public
REVOKE EXECUTE ON FUNCTION public.fn_upsert_lead_from_source(uuid, text, text, text, text, text, jsonb, text, text, jsonb, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_onboarding_on_proposal_accepted() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalc_onboarding_progress() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_dme_batch(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_dme_batch(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_dme_batch(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_dme_batch(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_upsert_lead_from_source(uuid, text, text, text, text, text, jsonb, text, text, jsonb, text, text) TO service_role;
