
DROP VIEW IF EXISTS public.profiles_with_email;

DROP POLICY IF EXISTS "autenticados podem inserir mensagens" ON public.job_comments;
CREATE POLICY "autenticados podem inserir mensagens" ON public.job_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categorias_financeiras;
CREATE POLICY "Authenticated users can insert categories" ON public.categorias_financeiras
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categorias_financeiras;
CREATE POLICY "Authenticated users can update categories" ON public.categorias_financeiras
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categorias_financeiras;
CREATE POLICY "Authenticated users can delete categories" ON public.categorias_financeiras
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert contas" ON public.contas_bancarias;
CREATE POLICY "Authenticated users can insert contas" ON public.contas_bancarias
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update contas" ON public.contas_bancarias;
CREATE POLICY "Authenticated users can update contas" ON public.contas_bancarias
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete contas" ON public.contas_bancarias;
CREATE POLICY "Authenticated users can delete contas" ON public.contas_bancarias
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Team can manage checklist" ON public.job_checklist;
CREATE POLICY "Team can manage checklist" ON public.job_checklist
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update checklist items" ON public.job_checklist;
CREATE POLICY "Authenticated users can update checklist items" ON public.job_checklist
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert proposal events" ON public.proposal_events;
CREATE POLICY "System can insert proposal events" ON public.proposal_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert error logs" ON public.system_errors_log;
CREATE POLICY "System can insert error logs" ON public.system_errors_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "sistema insere notificacoes" ON public.notificacoes;
CREATE POLICY "sistema insere notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

ALTER FUNCTION public.calculate_job_progress() SET search_path = public;
ALTER FUNCTION public.check_upcoming_deadlines() SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.fn_initialize_job_checklist() SET search_path = public;
ALTER FUNCTION public.force_generate_contract_transactions(uuid) SET search_path = public;
ALTER FUNCTION public.format_proposal_number(bigint) SET search_path = public;
ALTER FUNCTION public.generate_commission_transaction() SET search_path = public;
ALTER FUNCTION public.generate_proposal_number() SET search_path = public;
ALTER FUNCTION public.handle_finance_cancellation() SET search_path = public;
ALTER FUNCTION public.handle_payment_notification() SET search_path = public;
ALTER FUNCTION public.handle_proposal_acceptance() SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.set_proposal_number_display() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.validate_proposal_approval() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.calculate_job_progress() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_upcoming_deadlines() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_notification_preferences() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_dispatch_push_on_notification() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_initialize_job_checklist() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.force_generate_contract_transactions(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_contract_transactions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_finance_cancellation() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_job_assignment_notification() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_job_comment_notification() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_job_status_notification() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_payment_notification() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_module_permission(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_client_portal_user_id() FROM PUBLIC, anon;
