ALTER TABLE public.proposals ADD COLUMN payment_method TEXT;
GRANT ALL ON public.proposals TO service_role;
GRANT ALL ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO anon;