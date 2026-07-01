
-- 1. SECURITY DEFINER function EXECUTE: revoke from anon/authenticated/PUBLIC
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Keep RLS helper functions callable within RLS evaluation (SECURITY DEFINER runs as owner
-- regardless of caller EXECUTE for policy predicates on server side, but explicit grant to
-- authenticated for these is safe and avoids surprises when called from server code).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_module_permission(uuid, text, text) TO authenticated;

-- 2. editorial_month_strategies: replace always-true policy
DROP POLICY IF EXISTS "auth manage editorial strategies" ON public.editorial_month_strategies;

CREATE POLICY "Team manages editorial strategies"
  ON public.editorial_month_strategies
  FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Portal users read own client strategies"
  ON public.editorial_month_strategies
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
     WHERE cpu.auth_user_id = auth.uid()
       AND cpu.client_id = editorial_month_strategies.client_id
  ));

-- 3. lead_sources: column-level anon SELECT (RLS can't do column-level)
REVOKE SELECT ON public.lead_sources FROM anon;
GRANT SELECT (
  id, name, slug, is_active, default_stage_id,
  landing_headline, landing_subheadline, landing_description,
  landing_cta_label, landing_logo_url, landing_hero_image_url,
  landing_bg_color, landing_accent_color, landing_benefits,
  landing_testimonials, landing_form_fields, landing_success_message,
  landing_redirect_url, created_at, updated_at
) ON public.lead_sources TO anon;

-- 4. logos bucket: add team member scope
DROP POLICY IF EXISTS "Logos: upload autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Logos: update autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Logos: delete autenticado" ON storage.objects;

CREATE POLICY "Logos: upload team"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND public.is_team_member(auth.uid()));

CREATE POLICY "Logos: update team"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND public.is_team_member(auth.uid()))
  WITH CHECK (bucket_id = 'logos' AND public.is_team_member(auth.uid()));

CREATE POLICY "Logos: delete team"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND public.is_team_member(auth.uid()));

-- 5. partners-photos bucket: add team member scope, drop broad policies
DROP POLICY IF EXISTS "Allow authenticated to upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to view photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;

CREATE POLICY "Partners photos: read team"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partners-photos' AND public.is_team_member(auth.uid()));

CREATE POLICY "Partners photos: upload team"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partners-photos' AND public.is_team_member(auth.uid()));

CREATE POLICY "Partners photos: update team"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'partners-photos' AND public.is_team_member(auth.uid()))
  WITH CHECK (bucket_id = 'partners-photos' AND public.is_team_member(auth.uid()));

CREATE POLICY "Partners photos: delete team"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'partners-photos' AND public.is_team_member(auth.uid()));

-- 6. signatures bucket: remove broad ALL policy
DROP POLICY IF EXISTS "Authenticated manage on Signatures" ON storage.objects;

-- 7. profiles.google_refresh_token: hide from authenticated
REVOKE SELECT (google_refresh_token) ON public.profiles FROM authenticated;
REVOKE UPDATE (google_refresh_token) ON public.profiles FROM authenticated;

-- 8. notificacoes INSERT: restrict portal users; allow team to notify others
DROP POLICY IF EXISTS "sistema insere notificacoes" ON public.notificacoes;

CREATE POLICY "Users insert own notifications or team notifies others"
  ON public.notificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_team_member(auth.uid()));

-- 9. proposal_events INSERT: restrict to team
DROP POLICY IF EXISTS "System can insert proposal events" ON public.proposal_events;

CREATE POLICY "Team inserts proposal events"
  ON public.proposal_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
