-- Garantir que a tabela job_comments está configurada corretamente
ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;

-- Remover políticas de inserção antigas e possivelmente conflitantes
DROP POLICY IF EXISTS "Team can insert job comments" ON public.job_comments;
DROP POLICY IF EXISTS "Users can insert job comments" ON public.job_comments;
DROP POLICY IF EXISTS "autenticados podem inserir mensagens" ON public.job_comments;

-- Criar nova política de inserção simples e funcional
CREATE POLICY "autenticados podem inserir mensagens" 
ON public.job_comments FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Garantir política de leitura
DROP POLICY IF EXISTS "Team can view job comments" ON public.job_comments;
DROP POLICY IF EXISTS "leitura autenticados" ON public.job_comments;
CREATE POLICY "leitura autenticados" ON public.job_comments FOR SELECT TO authenticated USING (true);

-- Adicionar foreign key de user_id se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'job_comments_user_id_auth_fkey'
    ) THEN
        ALTER TABLE public.job_comments 
        ADD CONSTRAINT job_comments_user_id_auth_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_comments TO authenticated;
GRANT ALL ON public.job_comments TO service_role;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_comments;

-- Criar a tabela job_comentarios como backup/alternativa solicitada pelo usuário
CREATE TABLE IF NOT EXISTS public.job_comentarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  mensagem text NOT NULL,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_comentarios TO authenticated;
GRANT ALL ON public.job_comentarios TO service_role;

ALTER TABLE public.job_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura autenticados" ON public.job_comentarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "insercao autenticados" ON public.job_comentarios FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.job_comentarios;
