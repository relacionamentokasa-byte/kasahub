-- Adiciona a coluna number_display
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS number_display TEXT;

-- Cria a sequência para as propostas
CREATE SEQUENCE IF NOT EXISTS proposals_number_seq;

-- Função para gerar o número de registro formatado
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number_display IS NULL THEN
    NEW.number_display := 'PR-' || LPAD(nextval('proposals_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria o trigger para preencher o número automaticamente ao inserir
DROP TRIGGER IF EXISTS tr_generate_proposal_number ON public.proposals;
CREATE TRIGGER tr_generate_proposal_number
BEFORE INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.generate_proposal_number();

-- Atualiza registros existentes de forma retroativa
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.proposals WHERE number_display IS NULL ORDER BY created_at ASC LOOP
        UPDATE public.proposals 
        SET number_display = 'PR-' || LPAD(nextval('proposals_number_seq')::text, 4, '0')
        WHERE id = r.id;
    END LOOP;
END $$;