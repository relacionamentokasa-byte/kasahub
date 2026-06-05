
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_module_permission(uuid, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.project_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_balance(uuid) TO authenticated;
