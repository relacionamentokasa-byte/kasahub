
CREATE POLICY "Team can read boletos files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'boletos' AND public.is_team_member(auth.uid()));
