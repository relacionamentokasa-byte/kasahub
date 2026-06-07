-- Limpar políticas anteriores se houver (caso a migração anterior tenha falhado parcialmente)
DROP POLICY IF EXISTS "Permitir leitura pública de anexos de jobs" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de anexos de jobs para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deleção de anexos de jobs pelos próprios usuários" ON storage.objects;

-- Permissões para bucket privado
CREATE POLICY "Usuários autenticados podem ver anexos de jobs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'job-attachments');

CREATE POLICY "Usuários autenticados podem fazer upload de anexos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-attachments');

CREATE POLICY "Usuários autenticados podem deletar seus próprios uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'job-attachments');
