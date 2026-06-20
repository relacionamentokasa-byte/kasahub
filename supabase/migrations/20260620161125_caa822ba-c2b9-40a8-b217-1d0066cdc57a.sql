CREATE POLICY "auth read report-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-images');

CREATE POLICY "auth upload report-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-images');

CREATE POLICY "auth update report-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'report-images');

CREATE POLICY "auth delete report-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-images');
