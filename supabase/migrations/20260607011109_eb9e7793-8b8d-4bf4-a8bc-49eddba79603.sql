
-- 1. access_logs: use canonical has_role instead of custom_roles name check
DROP POLICY IF EXISTS "Admins can see all logs" ON public.access_logs;
CREATE POLICY "Admins can see all logs" ON public.access_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. profiles: revoke SELECT on google_refresh_token from authenticated (and anon)
REVOKE SELECT (google_refresh_token) ON public.profiles FROM authenticated;
REVOKE SELECT (google_refresh_token) ON public.profiles FROM anon;

-- 3. team_invites: restrict SELECT to admins only (emails are sensitive)
DROP POLICY IF EXISTS "Team reads invites" ON public.team_invites;
CREATE POLICY "Admins read invites" ON public.team_invites
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. error_logs: tighten INSERT policy - require user owns the log or it's anonymous (null), no more WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Users insert their own error logs" ON public.error_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 5. Function Search Path Mutable: fix update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 6. Revoke anon EXECUTE on SECURITY DEFINER functions (keep authenticated for app use)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_module_permission(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, text, text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.project_progress(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_record_timeline_event(uuid, uuid, text, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_module_permission(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.project_progress(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_record_timeline_event(uuid, uuid, text, text, text, jsonb) TO authenticated, service_role;
