
DROP POLICY IF EXISTS "Authenticated can read activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated can read leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated can read items" ON public.proposal_items;
DROP POLICY IF EXISTS "Authenticated can read proposals" ON public.proposals;

CREATE POLICY "Team reads lead activities" ON public.lead_activities
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team reads leads" ON public.leads
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team reads proposal items" ON public.proposal_items
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team reads proposals" ON public.proposals
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

-- Harden user_roles: only admins can insert/update/delete; users can only read their own row.
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
