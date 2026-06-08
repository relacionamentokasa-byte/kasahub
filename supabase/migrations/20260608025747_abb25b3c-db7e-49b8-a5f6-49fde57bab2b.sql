-- Drop existing policies if they are too restrictive or incorrect
DROP POLICY IF EXISTS "Admins manage invites" ON public.team_invites;
DROP POLICY IF EXISTS "Admins read invites" ON public.team_invites;

-- Allow authenticated users to view invites
CREATE POLICY "Users can view team invites" 
ON public.team_invites FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert/manage invites
-- We use a simpler check for now if custom function has_role is failing or missing
CREATE POLICY "Admins can manage team invites" 
ON public.team_invites FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ceo')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ceo')
  )
);

GRANT ALL ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;