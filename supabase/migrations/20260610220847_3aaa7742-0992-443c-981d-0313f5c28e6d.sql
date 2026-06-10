-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "leitura autenticados" ON job_comentarios;
DROP POLICY IF EXISTS "insercao autenticados" ON job_comentarios;
DROP POLICY IF EXISTS "todos autenticados leem mensagens" ON job_comentarios;

-- Criar nova política de leitura global para autenticados
CREATE POLICY "todos autenticados leem mensagens" 
ON job_comentarios FOR SELECT 
TO authenticated 
USING (true);

-- Garantir política de inserção para autenticados
CREATE POLICY "insercao autenticados" 
ON job_comentarios FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Políticas para UPDATE e DELETE (opcional, mas bom para integridade)
CREATE POLICY "usuarios gerenciam proprias mensagens" 
ON job_comentarios FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_comentarios TO authenticated;
GRANT ALL ON public.job_comentarios TO service_role;
