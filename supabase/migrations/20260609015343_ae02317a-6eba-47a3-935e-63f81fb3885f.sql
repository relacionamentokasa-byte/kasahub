-- Add delete policy for profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update projects foreign key to avoid blocking deletion
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_responsible_id_fkey,
ADD CONSTRAINT projects_responsible_id_fkey 
FOREIGN KEY (responsible_id) REFERENCES public.profiles(id) 
ON DELETE SET NULL;
