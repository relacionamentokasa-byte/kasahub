-- Fix status constraint to include 'paused' (Aguardando Cliente)
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'review'::text, 'paused'::text, 'adjustments'::text, 'done'::text, 'cancelled'::text]));

-- Allow audit log triggers to insert (system writes)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated, anon, service_role WITH CHECK (true);