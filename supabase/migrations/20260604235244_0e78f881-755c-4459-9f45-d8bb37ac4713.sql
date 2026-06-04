
-- Helper: is team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','ceo','gestor','operador')
  )
$$;

-- Replace permissive policies
DROP POLICY IF EXISTS "Authenticated can manage stages" ON public.lead_stages;
CREATE POLICY "Team can manage stages" ON public.lead_stages FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can manage leads" ON public.leads;
CREATE POLICY "Team can manage leads" ON public.leads FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can manage activities" ON public.lead_activities;
CREATE POLICY "Team can manage activities" ON public.lead_activities FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can manage proposals" ON public.proposals;
CREATE POLICY "Team can manage proposals" ON public.proposals FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can manage items" ON public.proposal_items;
CREATE POLICY "Team can manage items" ON public.proposal_items FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
