-- Remove políticas antigas se existirem para evitar duplicidade
DROP POLICY IF EXISTS "Public read on Signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage on Signatures" ON storage.objects;

-- Política para permitir leitura pública (SELECT) no bucket signatures
CREATE POLICY "Public read on Signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures');

-- Política para permitir que usuários autenticados façam upload, update e delete
CREATE POLICY "Authenticated manage on Signatures"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'signatures')
WITH CHECK (bucket_id = 'signatures');
