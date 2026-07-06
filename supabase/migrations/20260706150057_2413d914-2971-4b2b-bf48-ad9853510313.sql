
DROP POLICY IF EXISTS "Authenticated can manage lead tasks" ON public.lead_tasks;

CREATE POLICY "Auth read lead tasks"
  ON public.lead_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth insert lead tasks"
  ON public.lead_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth update lead tasks"
  ON public.lead_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth delete lead tasks"
  ON public.lead_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
