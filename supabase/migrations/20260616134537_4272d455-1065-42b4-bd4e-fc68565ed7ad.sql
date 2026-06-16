
-- Adiciona controle de valor previsto x real x pago em transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS valor_previsto NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS valor_real NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS paid_value NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS motivo_diferenca TEXT,
  ADD COLUMN IF NOT EXISTS observacao_diferenca TEXT;

-- Backfill: usa amount como valor previsto inicial
UPDATE public.transactions
   SET valor_previsto = amount
 WHERE valor_previsto IS NULL;

-- Para transações já pagas, registra paid_value = amount
UPDATE public.transactions
   SET paid_value = amount
 WHERE status = 'paid' AND paid_value IS NULL;

-- Torna valor_previsto NOT NULL com default 0
ALTER TABLE public.transactions
  ALTER COLUMN valor_previsto SET DEFAULT 0,
  ALTER COLUMN valor_previsto SET NOT NULL;

-- Restringe valores permitidos para motivo_diferenca
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_motivo_diferenca_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_motivo_diferenca_check
  CHECK (motivo_diferenca IS NULL OR motivo_diferenca IN ('multa','juros','multa_juros','desconto','reajuste','outro'));
