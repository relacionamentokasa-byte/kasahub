UPDATE public.transactions
SET valor_previsto = amount
WHERE (valor_previsto IS NULL OR valor_previsto = 0)
  AND amount IS NOT NULL
  AND amount <> 0;