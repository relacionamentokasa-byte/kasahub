-- 1. Revoke public execution from SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, text, text, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.fn_record_timeline_event(uuid, uuid, text, text, text, jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.automate_contract_setup() FROM public;
REVOKE EXECUTE ON FUNCTION public.generate_commission_transaction() FROM public;
REVOKE EXECUTE ON FUNCTION public.check_job_integrity() FROM public;

-- Grant back to necessary roles
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_record_timeline_event(uuid, uuid, text, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.automate_contract_setup() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_commission_transaction() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_job_integrity() TO authenticated, service_role;

-- 2. Fixing remaining permissive policies in operational flows
DROP POLICY IF EXISTS "Users can view dependencies" ON public.operational_flow_dependencies;
DROP POLICY IF EXISTS "Users can manage dependencies" ON public.operational_flow_dependencies;
CREATE POLICY "Team can manage operational flow dependencies" ON public.operational_flow_dependencies
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Users can view checklists" ON public.operational_flow_checklists;
DROP POLICY IF EXISTS "Users can manage checklists" ON public.operational_flow_checklists;
CREATE POLICY "Team can manage operational flow checklists" ON public.operational_flow_checklists
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));
