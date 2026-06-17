
CREATE POLICY "Logos: leitura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Logos: upload autenticado"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Logos: update autenticado"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logos')
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Logos: delete autenticado"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'logos');
