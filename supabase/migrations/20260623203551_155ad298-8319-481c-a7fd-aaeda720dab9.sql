
-- 1. LEAD SOURCES: anon só lê colunas seguras
DROP POLICY IF EXISTS "Anon reads active lead source landing fields" ON public.lead_sources;
REVOKE ALL ON public.lead_sources FROM anon;

GRANT SELECT (
  id, slug, name, is_active, default_stage_id, created_at,
  landing_headline, landing_subheadline, landing_description,
  landing_cta_label, landing_logo_url, landing_hero_image_url,
  landing_bg_color, landing_accent_color,
  landing_benefits, landing_testimonials, landing_form_fields,
  landing_success_message, landing_redirect_url
) ON public.lead_sources TO anon;

CREATE POLICY "Anon reads active lead sources (safe columns)"
  ON public.lead_sources
  FOR SELECT
  TO anon
  USING (is_active = true);

-- 2. JOB COMMENTS
DROP POLICY IF EXISTS "autenticados podem inserir mensagens" ON public.job_comments;

CREATE POLICY "Team can insert job comments"
  ON public.job_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_member(auth.uid())
    AND auth.uid() = user_id
  );

CREATE POLICY "Portal users insert non-internal comments on their jobs"
  ON public.job_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(is_internal, false) = false
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.clients c ON c.id = j.client_id
      WHERE j.id = job_comments.job_id
        AND c.portal_user_id = auth.uid()
    )
  );

-- 3. AGENCY INDICATOR TARGETS
DROP POLICY IF EXISTS "Users can manage targets for their indicators" ON public.agency_indicator_targets;
CREATE POLICY "Team manages indicator targets"
  ON public.agency_indicator_targets
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- 4. JOB STAGES / REPORT TEMPLATES
DROP POLICY IF EXISTS "Team can view stages" ON public.job_stages;
CREATE POLICY "Team can view stages"
  ON public.job_stages FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "authenticated can read templates" ON public.report_templates;
CREATE POLICY "Team reads report templates"
  ON public.report_templates FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

-- 5. AUDIT LOGS
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role inserts audit logs"
  ON public.audit_logs FOR INSERT TO service_role
  WITH CHECK (true);

-- 6. STORAGE
DROP POLICY IF EXISTS "Authenticated Read Access on Signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access on Signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access on Signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Access on Signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Access on Signatures" ON storage.objects;

CREATE POLICY "Team reads signatures"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'signatures' AND public.is_team_member(auth.uid()));
CREATE POLICY "Team uploads signatures"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signatures' AND public.is_team_member(auth.uid()));
CREATE POLICY "Team updates signatures"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'signatures' AND public.is_team_member(auth.uid()));
CREATE POLICY "Team deletes signatures"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'signatures' AND public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "auth read report-images" ON storage.objects;
DROP POLICY IF EXISTS "auth upload report-images" ON storage.objects;
DROP POLICY IF EXISTS "auth update report-images" ON storage.objects;
DROP POLICY IF EXISTS "auth delete report-images" ON storage.objects;

CREATE POLICY "Team reads report images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-images' AND public.is_team_member(auth.uid()));
CREATE POLICY "Team uploads report images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-images' AND public.is_team_member(auth.uid()));
CREATE POLICY "Team updates report images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'report-images' AND public.is_team_member(auth.uid()));
CREATE POLICY "Team deletes report images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-images' AND public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Usuários autenticados podem ver anexos de jobs" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de anexos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar seus próprios uploads" ON storage.objects;

-- 7. Revogar EXECUTE de funções administrativas
DO $$
DECLARE r record;
  keep text[] := ARRAY[
    'has_role','is_team_member','has_module_permission',
    'project_progress','fn_record_timeline_event'
  ];
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef = true
       AND p.proname <> ALL (keep)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      r.proname, r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
      r.proname, r.args
    );
  END LOOP;
END $$;
