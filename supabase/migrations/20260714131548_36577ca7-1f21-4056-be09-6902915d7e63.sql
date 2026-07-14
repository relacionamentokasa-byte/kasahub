
-- LOGOS: replace broad public SELECT with scoped anon read + full authenticated read
DROP POLICY IF EXISTS "Logos: leitura pública" ON storage.objects;

CREATE POLICY "Logos: anon read public assets"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'logos' AND name NOT LIKE 'avatars/%');

CREATE POLICY "Logos: authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'logos');

-- PROPOSAL-IMAGES: restrict to team members
DROP POLICY IF EXISTS "auth can read proposal images" ON storage.objects;
DROP POLICY IF EXISTS "auth can upload proposal images" ON storage.objects;
DROP POLICY IF EXISTS "auth can delete proposal images" ON storage.objects;

CREATE POLICY "Proposal images: team read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'proposal-images' AND public.is_team_member(auth.uid()));

CREATE POLICY "Proposal images: team upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposal-images' AND public.is_team_member(auth.uid()));

CREATE POLICY "Proposal images: team update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'proposal-images' AND public.is_team_member(auth.uid()))
WITH CHECK (bucket_id = 'proposal-images' AND public.is_team_member(auth.uid()));

CREATE POLICY "Proposal images: team delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proposal-images' AND public.is_team_member(auth.uid()));
