
DROP POLICY IF EXISTS "Users can manage transaction categories" ON public.transaction_categories;
CREATE POLICY "Team members can manage transaction categories"
  ON public.transaction_categories
  FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "anon can read proposal images" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated read assets" ON storage.objects;
CREATE POLICY "Team read public-assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'public-assets' AND public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Public read for specific shared buckets" ON storage.objects;
CREATE POLICY "Team read shared buckets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    (bucket_id = 'proposals' AND public.is_team_member(auth.uid()))
    OR (bucket_id = 'public-assets' AND public.is_team_member(auth.uid()))
  );

CREATE POLICY "Portal users can read own client boletos"
  ON storage.objects AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    storage.objects.bucket_id = 'boletos'
    AND EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.auth_user_id = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = cpu.client_id::text
    )
  );
