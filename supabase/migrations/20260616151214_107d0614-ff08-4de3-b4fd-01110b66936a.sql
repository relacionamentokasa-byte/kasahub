
CREATE TABLE public.approval_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('image','video','pdf','text')),
  content_url TEXT,
  content_text TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  feedback TEXT,
  sent_for_approval_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_items_client_status ON public.approval_items(client_id, status);
CREATE INDEX idx_approval_items_created ON public.approval_items(created_at DESC);
CREATE INDEX idx_approval_items_job ON public.approval_items(job_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_items TO authenticated;
GRANT ALL ON public.approval_items TO service_role;

ALTER TABLE public.approval_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage approval items"
  ON public.approval_items
  FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE TRIGGER update_approval_items_updated_at
  BEFORE UPDATE ON public.approval_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
