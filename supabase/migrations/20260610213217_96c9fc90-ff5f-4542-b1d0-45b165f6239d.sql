-- Drop restrictive team policy if it exists to replace it with more explicit ones
DROP POLICY IF EXISTS "Team can manage job comments" ON public.job_comments;

-- Policy to allow team members to SELECT job comments
CREATE POLICY "Team can view job comments" ON public.job_comments
FOR SELECT
TO authenticated
USING (is_team_member(auth.uid()));

-- Policy to allow team members to INSERT job comments
CREATE POLICY "Team can insert job comments" ON public.job_comments
FOR INSERT
TO authenticated
WITH CHECK (is_team_member(auth.uid()));

-- Policy to allow team members to UPDATE their OWN comments
-- (Already exists as "Users can update their own comments", but let's make sure)
DROP POLICY IF EXISTS "Users can update their own comments" ON public.job_comments;
CREATE POLICY "Users can update their own comments" ON public.job_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy to allow team members to DELETE their OWN comments
-- (Already exists as "Users can delete their own comments")
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.job_comments;
CREATE POLICY "Users can delete their own comments" ON public.job_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure portal users can still see their comments
DROP POLICY IF EXISTS "Portal users read their job comments" ON public.job_comments;
CREATE POLICY "Portal users read their job comments" ON public.job_comments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.jobs j
        JOIN public.clients c ON c.id = j.client_id
        WHERE j.id = job_comments.job_id AND c.portal_user_id = auth.uid()
    )
);

-- Grant permissions (standard requirement)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_comments TO authenticated;
GRANT ALL ON public.job_comments TO service_role;
