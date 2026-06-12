ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL;