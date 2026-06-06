-- 1. Fix Function Search Paths for all identified functions
ALTER FUNCTION public.project_progress(project_id uuid) SET search_path = public;
ALTER FUNCTION public.account_balance(account_id uuid) SET search_path = public;
ALTER FUNCTION public.has_module_permission(p_user_id uuid, p_module text, p_permission text) SET search_path = public;
ALTER FUNCTION public.fn_log_job_changes() SET search_path = public;
ALTER FUNCTION public.sync_client_portal_user_id() SET search_path = public;
ALTER FUNCTION public.fn_record_timeline_event(uuid, uuid, text, text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.update_extra_demands_updated_at() SET search_path = public;
ALTER FUNCTION public.automate_contract_setup() SET search_path = public;
ALTER FUNCTION public.update_job_last_activity() SET search_path = public;
ALTER FUNCTION public.generate_commission_transaction() SET search_path = public;
ALTER FUNCTION public.ensure_notification_preferences() SET search_path = public;
ALTER FUNCTION public.notify_user(uuid, text, text, text, text, text, text, uuid) SET search_path = public;
ALTER FUNCTION public.check_job_integrity() SET search_path = public;

-- 2. Hardening RLS for remaining tables
DROP POLICY IF EXISTS "Users can view jobs" ON public.operational_flow_jobs;
DROP POLICY IF EXISTS "Users can manage jobs" ON public.operational_flow_jobs;
CREATE POLICY "Team can manage operational flow jobs" ON public.operational_flow_jobs
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Users can view job history" ON public.job_history;
DROP POLICY IF EXISTS "Users can insert job history" ON public.job_history;
CREATE POLICY "Team can manage job history" ON public.job_history
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Users can manage job attachments" ON public.job_attachments;
CREATE POLICY "Team can manage job attachments" ON public.job_attachments
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Users can view timeline events" ON public.client_timeline_events;
DROP POLICY IF EXISTS "Users can insert timeline events" ON public.client_timeline_events;
CREATE POLICY "Team can manage timeline events" ON public.client_timeline_events
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Portal users can view their own timeline" ON public.client_timeline_events;
CREATE POLICY "Portal users can view their own timeline" ON public.client_timeline_events
  FOR SELECT TO authenticated 
  USING (client_id IN (SELECT id FROM public.clients WHERE portal_user_id = auth.uid()));

-- 3. Additional Module Access Control
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os parceiros" ON public.partners;
CREATE POLICY "Team can view partners" ON public.partners
  FOR SELECT TO authenticated USING (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver as metas" ON public.agency_indicators;
CREATE POLICY "Team can view agency indicators" ON public.agency_indicators
  FOR SELECT TO authenticated USING (is_team_member(auth.uid()));
