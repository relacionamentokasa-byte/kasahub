-- Add to_account_id column to support transfers
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES public.bank_accounts(id);

-- Add categories for the new types
INSERT INTO public.financial_categories (id, name, kind)
VALUES 
  (gen_random_uuid(), 'Transferência entre Contas', 'transfer'),
  (gen_random_uuid(), 'Ajuste de Saldo', 'adjustment');

GRANT ALL ON public.transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
