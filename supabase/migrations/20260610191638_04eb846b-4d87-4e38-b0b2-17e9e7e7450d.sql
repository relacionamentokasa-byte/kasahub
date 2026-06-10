-- Garantir que o papel authenticated tenha permissões básicas na tabela
GRANT ALL ON public.job_checklist TO authenticated;
GRANT ALL ON public.job_checklist TO service_role;

-- Recriar a política com definição clara
DROP POLICY IF EXISTS "Team can manage checklist" ON public.job_checklist;

CREATE POLICY "Team can manage checklist" 
ON public.job_checklist 
FOR ALL 
TO authenticated 
USING (public.is_team_member(auth.uid()))
WITH CHECK (public.is_team_member(auth.uid()));

-- Garantir que a função is_team_member seja acessível
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
