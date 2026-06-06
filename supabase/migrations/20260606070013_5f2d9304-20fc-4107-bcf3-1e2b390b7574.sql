
-- 1) profiles.google_refresh_token: restrict via column-level privileges
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (
  id, updated_at, created_at, phone, job_title, avatar_url, display_name,
  full_name, agency_logo_url, custom_role_id, department, status, last_access,
  google_calendar_id, google_calendar_connected
) ON public.profiles TO authenticated;

-- 2) user_invites: replace policy
DROP POLICY IF EXISTS "Users can manage invites" ON public.user_invites;
CREATE POLICY "Admins manage invites"
  ON public.user_invites
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role));

-- 3) operational_flow_stages: drop public policies, restrict to team members
DROP POLICY IF EXISTS "Users can manage stages" ON public.operational_flow_stages;
DROP POLICY IF EXISTS "Users can view stages" ON public.operational_flow_stages;
CREATE POLICY "Team can manage operational flow stages"
  ON public.operational_flow_stages
  FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- 4) access_logs: limit to authenticated role
DROP POLICY IF EXISTS "Admins can see all logs" ON public.access_logs;
DROP POLICY IF EXISTS "Users can see their own logs" ON public.access_logs;
CREATE POLICY "Admins can see all logs"
  ON public.access_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT p.id FROM public.profiles p
    WHERE p.custom_role_id IN (
      SELECT cr.id FROM public.custom_roles cr WHERE cr.name = 'Administrador'
    )
  ));
CREATE POLICY "Users can see their own logs"
  ON public.access_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5) calendar_events: scope portal users to their own client
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios eventos" ON public.calendar_events;
CREATE POLICY "Team or scoped portal can read calendar events"
  ON public.calendar_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_team_member(auth.uid())
    OR (
      client_id IS NOT NULL
      AND client_id IN (SELECT c.id FROM public.clients c WHERE c.portal_user_id = auth.uid())
    )
  );
CREATE POLICY "Users manage own calendar events"
  ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Team manages calendar events"
  ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- 6) storage job-attachments: add SELECT and DELETE
CREATE POLICY "Team can read job attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'job-attachments' AND public.is_team_member(auth.uid()));
CREATE POLICY "Team can delete job attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-attachments' AND public.is_team_member(auth.uid()));

-- 7) Revoke anon EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.project_progress(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_module_permission(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_record_timeline_event(uuid, uuid, text, text, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, text, text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.project_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_module_permission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_record_timeline_event(uuid, uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
