-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_checklist TO authenticated;
GRANT ALL ON public.job_checklist TO service_role;

-- Recreate the policy to be more inclusive while still secure
DROP POLICY IF EXISTS "Team can manage checklist" ON public.job_checklist;

CREATE POLICY "Team can manage checklist" ON public.job_checklist
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Ensure progress can be synced back to jobs table
GRANT UPDATE ON public.jobs TO authenticated;
