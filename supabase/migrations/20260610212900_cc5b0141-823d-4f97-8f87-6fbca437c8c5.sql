-- Remover políticas existentes para evitar conflitos se necessário, mas vamos apenas adicionar as que faltam
-- A política "Team can manage job comments" já existe mas usa "is_team_member(auth.uid())"
-- Vamos adicionar uma política mais abrangente para garantir que membros do time possam inserir comentários

CREATE POLICY "Users can insert job comments" ON public.job_comments 
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON public.job_comments 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.job_comments 
FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- Garantir que a tabela tenha RLS habilitado
ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;

-- Grants básicos
GRANT ALL ON public.job_comments TO authenticated;
GRANT ALL ON public.job_comments TO service_role;
