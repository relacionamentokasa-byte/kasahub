-- Drop existing policy if any to avoid conflicts
DROP POLICY IF EXISTS "Users can update their own checklist items" ON public.job_checklist;
DROP POLICY IF EXISTS "Authenticated users can update checklist items" ON public.job_checklist;

-- Create a simple policy allowing authenticated users to update checklist items
CREATE POLICY "Authenticated users can update checklist items" 
ON public.job_checklist 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.job_checklist ENABLE ROW LEVEL SECURITY;

-- Grant permissions just in case
GRANT UPDATE ON public.job_checklist TO authenticated;
GRANT ALL ON public.job_checklist TO service_role;
