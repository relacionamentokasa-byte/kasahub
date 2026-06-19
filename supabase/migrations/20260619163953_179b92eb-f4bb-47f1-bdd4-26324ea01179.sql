
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS boleto_pdf_path text,
  ADD COLUMN IF NOT EXISTS boleto_linha_digitavel text,
  ADD COLUMN IF NOT EXISTS boleto_pix_copia_cola text;

-- Allow team members to upload/update/delete manual boletos in the 'boletos' bucket
DROP POLICY IF EXISTS "Team can upload boletos files" ON storage.objects;
CREATE POLICY "Team can upload boletos files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'boletos' AND public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Team can update boletos files" ON storage.objects;
CREATE POLICY "Team can update boletos files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'boletos' AND public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Team can delete boletos files" ON storage.objects;
CREATE POLICY "Team can delete boletos files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'boletos' AND public.is_team_member(auth.uid()));
