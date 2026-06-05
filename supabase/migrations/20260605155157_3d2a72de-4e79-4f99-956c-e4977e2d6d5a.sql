
-- Add operational/financial template fields to proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS responsible_id uuid,
  ADD COLUMN IF NOT EXISTS briefing text,
  ADD COLUMN IF NOT EXISTS payment_kind text NOT NULL DEFAULT 'recurring',
  ADD COLUMN IF NOT EXISTS installments int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS first_due_date date,
  ADD COLUMN IF NOT EXISTS billing_day int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS account_id uuid,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS generated_project_id uuid,
  ADD COLUMN IF NOT EXISTS generated_contract_id uuid,
  ADD COLUMN IF NOT EXISTS auto_create_jobs boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recurring_months int NOT NULL DEFAULT 12;

-- Per-item job template key
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS job_template text;

-- Helpful indexes for lookups by proposal / contract
CREATE INDEX IF NOT EXISTS idx_transactions_proposal_id ON public.transactions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contract_id ON public.transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_projects_proposal_id ON public.projects(proposal_id);
CREATE INDEX IF NOT EXISTS idx_contracts_proposal_id ON public.contracts(proposal_id);
