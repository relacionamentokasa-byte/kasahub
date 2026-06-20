ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS segment text;
COMMENT ON COLUMN public.clients.segment IS 'Segmento de mercado do cliente (ex: Saúde, E-commerce, Educação)';
CREATE INDEX IF NOT EXISTS idx_clients_segment ON public.clients (segment);