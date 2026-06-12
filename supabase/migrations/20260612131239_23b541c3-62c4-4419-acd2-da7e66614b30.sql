ALTER TABLE public.transactions ADD COLUMN category TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;