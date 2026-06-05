CREATE POLICY "Team reads all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (is_team_member(auth.uid()));
