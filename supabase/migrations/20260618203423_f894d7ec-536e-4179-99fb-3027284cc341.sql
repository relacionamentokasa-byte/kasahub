
-- 1. audit_logs: remove anon from INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated, service_role WITH CHECK (true);

-- 2. job_comments: remove overly permissive SELECT, restrict to team members (portal policy already exists)
DROP POLICY IF EXISTS "leitura autenticados" ON public.job_comments;
CREATE POLICY "Team members read job comments" ON public.job_comments
  FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

-- 3. team_invites: restrict SELECT to admin/ceo only
DROP POLICY IF EXISTS "Users can view team invites" ON public.team_invites;
CREATE POLICY "Admins view team invites" ON public.team_invites
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin'::app_role,'ceo'::app_role)));

-- 4. Storage: drop public-read policies on private buckets
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public read on Signatures" ON storage.objects;

-- 5. Revoke EXECUTE from anon/public on SECURITY DEFINER trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_extra_demand_approval() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_job_mention_notification() FROM PUBLIC, anon;

-- 6. Realtime: enable RLS and restrict broadcasts to internal team members
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members can use realtime" ON realtime.messages;
CREATE POLICY "Team members can use realtime" ON realtime.messages
  FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));
