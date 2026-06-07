-- access_logs policies
DROP POLICY IF EXISTS "Anyone can insert access logs" ON public.access_logs;
CREATE POLICY "Users can insert their own access logs" ON public.access_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure service_role can do anything on access_logs (it already can by default but just to be sure if RLS was messed up)
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- proposal_events policies
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team can view proposal events" ON public.proposal_events;
CREATE POLICY "Team can view proposal events" ON public.proposal_events
  FOR SELECT TO authenticated
  USING (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "System can insert proposal events" ON public.proposal_events;
CREATE POLICY "System can insert proposal events" ON public.proposal_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT ALL ON public.proposal_events TO authenticated;
GRANT ALL ON public.proposal_events TO service_role;
