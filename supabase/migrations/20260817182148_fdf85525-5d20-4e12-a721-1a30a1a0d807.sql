-- Adiciona a coluna friendly_number se não existir
ALTER TABLE public.dme_batches ADD COLUMN IF NOT EXISTS friendly_number TEXT;

-- Cria a sequence para os números dos lotes se não existir
CREATE SEQUENCE IF NOT EXISTS public.dme_batch_number_seq START 1;

-- Função para formatar o número do lote (001, 002...)
CREATE OR REPLACE FUNCTION public.format_dme_batch_number() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.friendly_number IS NULL THEN
        NEW.friendly_number := LPAD(nextval('public.dme_batch_number_seq')::text, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para preencher o friendly_number automaticamente
DROP TRIGGER IF EXISTS trg_set_dme_batch_number ON public.dme_batches;
CREATE TRIGGER trg_set_dme_batch_number
BEFORE INSERT ON public.dme_batches
FOR EACH ROW
EXECUTE FUNCTION public.format_dme_batch_number();

-- Atualiza os lotes existentes mantendo a ordem de criação
DO $$
DECLARE
    r RECORD;
    val INT := 1;
BEGIN
    FOR r IN SELECT id FROM public.dme_batches ORDER BY created_at ASC LOOP
        UPDATE public.dme_batches SET friendly_number = LPAD(val::text, 3, '0') WHERE id = r.id;
        val := val + 1;
    END LOOP;
    -- Ajusta a sequence para o próximo valor
    PERFORM setval('public.dme_batch_number_seq', COALESCE((SELECT MAX(friendly_number::int) FROM public.dme_batches), 0) + 1, false);
END $$;

-- Garantir acesso
GRANT SELECT, UPDATE ON public.dme_batches TO authenticated;
GRANT ALL ON public.dme_batches TO service_role;