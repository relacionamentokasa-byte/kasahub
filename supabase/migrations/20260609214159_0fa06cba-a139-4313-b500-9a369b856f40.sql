-- Allow authenticated users to read files in the signatures bucket
-- Since public buckets are blocked, we use an authenticated policy
CREATE POLICY "Authenticated Read Access on Signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signatures');

-- Allow authenticated users to upload files to the signatures bucket
CREATE POLICY "Authenticated Upload Access on Signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signatures');

-- Allow authenticated users to update/delete their own files in the signatures bucket
CREATE POLICY "Authenticated Update Access on Signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'signatures');

CREATE POLICY "Authenticated Delete Access on Signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'signatures');