
-- 1. financial_categories: add cost_center
ALTER TABLE public.financial_categories ADD COLUMN IF NOT EXISTS cost_center text;

-- 2. bank_accounts: add agency / account_number
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS agency text;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS account_number text;

-- 3. transactions: add job_id (no FK to keep flexible)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS job_id uuid;
CREATE INDEX IF NOT EXISTS idx_transactions_job_id ON public.transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON public.transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_proposal_id ON public.transactions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contract_id ON public.transactions(contract_id);

-- 4. seed default cost-center expense categories (idempotent by name)
INSERT INTO public.financial_categories (name, kind, cost_center, color)
SELECT v.name, 'expense', v.cost_center, v.color
FROM (VALUES
  ('Operação','Operação','#3B82F6'),
  ('Marketing','Marketing','#EC4899'),
  ('Comercial','Comercial','#22C55E'),
  ('Administrativo','Administrativo','#A855F7'),
  ('Ferramentas / Software','Ferramentas','#F59E0B'),
  ('Equipe / Salários','Equipe','#0EA5E9'),
  ('Freelancers','Freelancers','#EF4444')
) AS v(name, cost_center, color)
WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories f WHERE f.name = v.name);

-- 5. seed default income categories
INSERT INTO public.financial_categories (name, kind, color)
SELECT v.name, 'income', v.color
FROM (VALUES
  ('Recorrente','#22C55E'),
  ('Avulso','#FFBC45'),
  ('Projeto Especial','#A855F7')
) AS v(name, color)
WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories f WHERE f.name = v.name AND f.kind = 'income');
