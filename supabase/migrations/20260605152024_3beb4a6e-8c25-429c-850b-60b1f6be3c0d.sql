
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS proposal_id uuid;

CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_contract_id ON public.projects(contract_id);
CREATE INDEX IF NOT EXISTS idx_projects_proposal_id ON public.projects(proposal_id);

-- Backfill proposals.client_id from client_name -> clients.company/name (case-insensitive)
UPDATE public.proposals p
SET client_id = c.id
FROM public.clients c
WHERE p.client_id IS NULL
  AND (
    lower(trim(c.company)) = lower(trim(p.client_name))
    OR lower(trim(c.name)) = lower(trim(p.client_name))
  );
