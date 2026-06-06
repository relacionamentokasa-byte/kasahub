-- 1. Hardening Security Functions
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','ceo','gestor','operador')
  )
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

-- 2. Fixing Overly Permissive Policies (WARN 11, 12, 13 etc)
DROP POLICY IF EXISTS "Users can manage contract templates" ON public.contract_templates;
CREATE POLICY "Team can manage contract templates" ON public.contract_templates
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Users can view operational flows" ON public.operational_flows;
DROP POLICY IF EXISTS "Users can manage operational flows" ON public.operational_flows;
CREATE POLICY "Team can manage operational flows" ON public.operational_flows
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Users can view stages" ON public.job_stages;
CREATE POLICY "Team can view stages" ON public.job_stages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stages" ON public.job_stages
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Securing Critical Business Tables (Isolation for Portal Users)
-- Clients
DROP POLICY IF EXISTS "Clients can read their own record" ON public.clients;
CREATE POLICY "Portal users can read their own client record" ON public.clients
  FOR SELECT TO authenticated USING (portal_user_id = auth.uid());

-- Jobs (Critical Fix: Ensure client can only see their own jobs)
DROP POLICY IF EXISTS "Clients can read their jobs" ON public.jobs;
CREATE POLICY "Portal users can read their own client jobs" ON public.jobs
  FOR SELECT TO authenticated 
  USING (
    is_team_member(auth.uid()) OR 
    (client_id IN (SELECT id FROM public.clients WHERE portal_user_id = auth.uid()))
  );

-- Projects
DROP POLICY IF EXISTS "Team can manage projects" ON public.projects;
CREATE POLICY "Team can manage projects" ON public.projects
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Portal users can view their own projects" ON public.projects
  FOR SELECT TO authenticated 
  USING (client_id IN (SELECT id FROM public.clients WHERE portal_user_id = auth.uid()));

-- Extra Demands (DME)
DROP POLICY IF EXISTS "Users can manage extra_demands" ON public.extra_demands;
CREATE POLICY "Team can manage extra_demands" ON public.extra_demands
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Portal users can view their own extra_demands" ON public.extra_demands
  FOR SELECT TO authenticated 
  USING (client_id IN (SELECT id FROM public.clients WHERE portal_user_id = auth.uid()));

-- Proposals (Public Token handled via RPC/Admin but RLS should still protect the table)
DROP POLICY IF EXISTS "Team reads proposals" ON public.proposals;
DROP POLICY IF EXISTS "Team can manage proposals" ON public.proposals;
CREATE POLICY "Team can manage proposals" ON public.proposals
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Portal users can view their own proposals" ON public.proposals
  FOR SELECT TO authenticated 
  USING (client_id IN (SELECT id FROM public.clients WHERE portal_user_id = auth.uid()));

-- Transactions
DROP POLICY IF EXISTS "Team manages transactions" ON public.transactions;
CREATE POLICY "Team can manage transactions" ON public.transactions
  FOR ALL TO authenticated USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Portal users can view their own invoices" ON public.transactions
  FOR SELECT TO authenticated 
  USING (
    client_id IN (SELECT id FROM public.clients WHERE portal_user_id = auth.uid()) AND
    kind = 'income'
  );

-- 4. Audit Log and Access Control
DROP POLICY IF EXISTS "Admins and managers can view audit logs" ON public.audit_logs;
CREATE POLICY "Privileged users can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'ceo') OR 
    has_role(auth.uid(), 'gestor')
  );

-- 5. Storage Security (Hardening public buckets)
-- Assuming 'proposals' and 'job-attachments' buckets exist
DO $$
BEGIN
  -- Ensure only team members can upload to critical buckets
  DROP POLICY IF EXISTS "Team can upload job attachments" ON storage.objects;
  CREATE POLICY "Team can upload job attachments" ON storage.objects
    FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'job-attachments' AND is_team_member(auth.uid()));

  -- Public can only read from specific paths if shared
  DROP POLICY IF EXISTS "Anyone can view public attachments" ON storage.objects;
  CREATE POLICY "Public read for specific shared buckets" ON storage.objects
    FOR SELECT USING (bucket_id IN ('proposals', 'public-assets'));
END $$;

-- 6. Fixing Function Search Path for all triggers and helpers (example for one, others follow pattern)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
