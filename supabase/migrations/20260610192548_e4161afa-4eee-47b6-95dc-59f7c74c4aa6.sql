-- Drop the existing policy to recreate it more clearly if needed, 
-- but first let's just make sure UPDATE is explicitly granted and the policy allows it.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_checklist TO authenticated;
GRANT ALL ON public.job_checklist TO service_role;

-- Recreate the policy to be absolutely sure it covers everything
DROP POLICY IF EXISTS "Team can manage checklist" ON public.job_checklist;

CREATE POLICY "Team can manage checklist" ON public.job_checklist
    FOR ALL
    TO authenticated
    USING (public.is_team_member(auth.uid()))
    WITH CHECK (public.is_team_member(auth.uid()));

-- Also ensure the jobs table can be updated for progress synchronization
GRANT UPDATE ON public.jobs TO authenticated;
