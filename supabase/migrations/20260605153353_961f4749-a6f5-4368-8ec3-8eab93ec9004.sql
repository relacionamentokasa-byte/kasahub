
-- Restrict agency_settings SELECT to team members only
DROP POLICY IF EXISTS "Authenticated read settings" ON public.agency_settings;
CREATE POLICY "Team reads settings"
  ON public.agency_settings
  FOR SELECT
  TO authenticated
  USING (public.is_team_member(auth.uid()));

-- Revoke EXECUTE on SECURITY DEFINER helpers from anon/public to prevent
-- anonymous callers from invoking them via the Data API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_module_permission(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.project_progress(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.account_balance(uuid) FROM PUBLIC, anon;
