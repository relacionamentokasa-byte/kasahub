-- The bucket already exists based on previous query, we just need to make it public and set policies.
-- Note: supabase--storage_update_bucket should be used for the public flag, but we also need RLS.

-- Allow public access to the partners-photos bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'partners-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'partners-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to update/delete their own photos (or any if preferred, here any authenticated)
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'partners-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'partners-photos' AND auth.role() = 'authenticated');
