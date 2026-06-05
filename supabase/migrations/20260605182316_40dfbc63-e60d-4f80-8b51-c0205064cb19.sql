
-- Add new fields to proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS contract_type text NOT NULL DEFAULT 'recurring',
  ADD COLUMN IF NOT EXISTS commercial_id uuid,
  ADD COLUMN IF NOT EXISTS operational_id uuid,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS target_kind text NOT NULL DEFAULT 'client';

-- Add deliverables to proposal_items
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS deliverables jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Proposal events / timeline
CREATE TABLE IF NOT EXISTS public.proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL,
  type text NOT NULL,
  actor_id uuid,
  actor_name text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_events TO authenticated;
GRANT ALL ON public.proposal_events TO service_role;

ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team manages proposal events"
  ON public.proposal_events
  FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE INDEX IF NOT EXISTS proposal_events_proposal_idx
  ON public.proposal_events(proposal_id, created_at DESC);
