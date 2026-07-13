
CREATE POLICY "auth can upload proposal images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'proposal-images');
CREATE POLICY "auth can read proposal images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'proposal-images');
CREATE POLICY "anon can read proposal images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'proposal-images');
CREATE POLICY "auth can delete proposal images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'proposal-images');
