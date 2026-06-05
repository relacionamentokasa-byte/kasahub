
-- 1. Profiles: restrict reads to team members or self
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles readable by team or self"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_team_member(auth.uid()) OR auth.uid() = id);

-- 2. custom_roles: team only
DROP POLICY IF EXISTS "Authenticated read custom roles" ON public.custom_roles;
CREATE POLICY "Team reads custom roles"
  ON public.custom_roles FOR SELECT TO authenticated
  USING (is_team_member(auth.uid()));

-- 3. job_stages: team OR portal user with a job in that stage
DROP POLICY IF EXISTS "Authenticated can read job stages" ON public.job_stages;
CREATE POLICY "Team or portal reads job stages"
  ON public.job_stages FOR SELECT TO authenticated
  USING (
    is_team_member(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.clients c ON c.id = j.client_id
      WHERE j.stage_id = job_stages.id AND c.portal_user_id = auth.uid()
    )
  );

-- 4. lead_stages: team only
DROP POLICY IF EXISTS "Authenticated can read stages" ON public.lead_stages;
CREATE POLICY "Team reads lead stages"
  ON public.lead_stages FOR SELECT TO authenticated
  USING (is_team_member(auth.uid()));

-- 5. services: team OR portal user scoped via client_services
DROP POLICY IF EXISTS "Authenticated reads services" ON public.services;
CREATE POLICY "Team or scoped portal reads services"
  ON public.services FOR SELECT TO authenticated
  USING (
    is_team_member(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.client_services cs
      JOIN public.clients c ON c.id = cs.client_id
      WHERE cs.service_id = services.id AND c.portal_user_id = auth.uid()
    )
  );

-- 6. job_comments: allow portal users to read comments on their own jobs
CREATE POLICY "Portal users read their job comments"
  ON public.job_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.clients c ON c.id = j.client_id
      WHERE j.id = job_comments.job_id AND c.portal_user_id = auth.uid()
    )
  );

-- 7. Keep clients.portal_user_id in sync with client_portal_users.auth_user_id
CREATE OR REPLACE FUNCTION public.sync_client_portal_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL THEN
    UPDATE public.clients
       SET portal_user_id = NEW.auth_user_id
     WHERE id = NEW.client_id
       AND (portal_user_id IS DISTINCT FROM NEW.auth_user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_client_portal_user_id_trg ON public.client_portal_users;
CREATE TRIGGER sync_client_portal_user_id_trg
AFTER INSERT OR UPDATE OF auth_user_id, client_id ON public.client_portal_users
FOR EACH ROW EXECUTE FUNCTION public.sync_client_portal_user_id();
