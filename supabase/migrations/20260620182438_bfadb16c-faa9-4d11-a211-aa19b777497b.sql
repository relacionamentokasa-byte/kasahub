-- Permite leitura pública da assinatura da empresa (mesmo padrão do bucket de logos),
-- para que a imagem apareça na configuração e na proposta pública.
DROP POLICY IF EXISTS "Signatures: leitura pública" ON storage.objects;
CREATE POLICY "Signatures: leitura pública"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'signatures');