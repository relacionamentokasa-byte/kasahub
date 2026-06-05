
CREATE TABLE public.client_deletion_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  client_name text NOT NULL,
  deleted_by uuid,
  deleted_by_name text,
  projects_removed integer NOT NULL DEFAULT 0,
  jobs_removed integer NOT NULL DEFAULT 0,
  transactions_cancelled integer NOT NULL DEFAULT 0,
  transactions_kept integer NOT NULL DEFAULT 0,
  proposals_removed integer NOT NULL DEFAULT 0,
  proposals_kept integer NOT NULL DEFAULT 0,
  portal_users_removed integer NOT NULL DEFAULT 0,
  services_removed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.client_deletion_audit TO authenticated;
GRANT ALL ON public.client_deletion_audit TO service_role;

ALTER TABLE public.client_deletion_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team reads deletion audit"
  ON public.client_deletion_audit FOR SELECT TO authenticated
  USING (is_team_member(auth.uid()));

CREATE POLICY "Team inserts deletion audit"
  ON public.client_deletion_audit FOR INSERT TO authenticated
  WITH CHECK (is_team_member(auth.uid()));
