
CREATE TABLE public.job_approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  attachment_id UUID REFERENCES public.job_attachments(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('approved','adjustment_requested','comment')),
  feedback TEXT,
  created_by TEXT NOT NULL DEFAULT 'cliente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_approval_logs_job ON public.job_approval_logs(job_id);
CREATE INDEX idx_job_approval_logs_created_at ON public.job_approval_logs(created_at DESC);

GRANT SELECT, INSERT ON public.job_approval_logs TO authenticated;
GRANT ALL ON public.job_approval_logs TO service_role;

ALTER TABLE public.job_approval_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view approval logs"
ON public.job_approval_logs FOR SELECT
TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team can insert approval logs"
ON public.job_approval_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_team_member(auth.uid()));
