-- Verificar se a política já existe e recriá-la para garantir permissões corretas
DROP POLICY IF EXISTS "Team can manage checklist" ON public.job_checklist;

CREATE POLICY "Team can manage checklist" ON public.job_checklist
FOR ALL
TO authenticated
USING (is_team_member(auth.uid()))
WITH CHECK (is_team_member(auth.uid()));

-- Garantir que a tabela tenha RLS habilitado
ALTER TABLE public.job_checklist ENABLE ROW LEVEL SECURITY;

-- Conceder permissões básicas para o papel authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_checklist TO authenticated;
GRANT ALL ON public.job_checklist TO service_role;