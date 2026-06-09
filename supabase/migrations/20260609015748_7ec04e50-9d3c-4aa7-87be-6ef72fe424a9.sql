-- Allow authenticated users to upload photos to the 'partners-photos' bucket
CREATE POLICY "Allow authenticated to upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'partners-photos');

-- Allow authenticated users to view photos from the 'partners-photos' bucket
CREATE POLICY "Allow authenticated to view photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'partners-photos');

-- Allow users to update their own photos
CREATE POLICY "Allow users to update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'partners-photos');

-- Allow users to delete their own photos
CREATE POLICY "Allow users to delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'partners-photos');
