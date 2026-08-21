ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS effective_date DATE GENERATED ALWAYS AS (
  CASE 
    WHEN status = 'paid' THEN payment_date
    ELSE due_date 
  END
) STORED;

-- Como a coluna depende de status e payment_date, precisamos garantir que elas não sejam nulas quando o cálculo exigir.
-- due_date já é NOT NULL. payment_date pode ser nula para pendentes.

CREATE INDEX IF NOT EXISTS idx_transactions_effective_date ON public.transactions (effective_date);