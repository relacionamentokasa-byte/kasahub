ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_investment boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transactions_is_internal ON public.transactions(is_internal) WHERE is_internal = true;
CREATE INDEX IF NOT EXISTS idx_transactions_is_investment ON public.transactions(is_investment) WHERE is_investment = true;

COMMENT ON COLUMN public.transactions.is_internal IS 'Custo interno da Kasa — despesa da própria agência, sem cliente/fornecedor/freelancer vinculado';
COMMENT ON COLUMN public.transactions.is_investment IS 'Lançamento classificado como investimento (CAPEX) — separado do resultado operacional nos relatórios';