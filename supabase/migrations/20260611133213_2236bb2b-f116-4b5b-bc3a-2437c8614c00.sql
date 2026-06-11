-- Adiciona coluna de identificador de lote de importação
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Garante que o service_role e usuários autenticados possam ver a nova coluna
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
