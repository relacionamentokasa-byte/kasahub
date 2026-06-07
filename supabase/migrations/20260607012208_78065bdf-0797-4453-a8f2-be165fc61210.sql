-- Fix permissions for helper functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.has_module_permission(uuid, text, text) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.project_progress(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_record_timeline_event(uuid, uuid, text, text, text, jsonb) TO authenticated, service_role;

-- Fix permissions for tables that were accidentally restricted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO anon;

-- Explicitly ensure google_refresh_token remains restricted if that was the intent,
-- but the previous REVOKE might have been too broad or caused issues with table-level grants.
-- In Postgres, table-level GRANT SELECT allows selecting all columns. 
-- To restrict one column, we need to grant at column level or revoke at column level after table level.
REVOKE SELECT (google_refresh_token) ON public.profiles FROM authenticated;
REVOKE SELECT (google_refresh_token) ON public.profiles FROM anon;

-- Ensure team_invites is accessible to authenticated users (RLS will still restrict who sees what)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;

-- Ensure access_logs is accessible
GRANT SELECT, INSERT ON public.access_logs TO authenticated;
GRANT ALL ON public.access_logs TO service_role;

-- Ensure error_logs is accessible
GRANT SELECT, INSERT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;
GRANT INSERT ON public.error_logs TO anon;
