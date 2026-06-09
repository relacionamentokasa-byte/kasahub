-- Criar a coluna number_display se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'number_display') THEN
        ALTER TABLE public.proposals ADD COLUMN number_display TEXT UNIQUE;
    END IF;
END $$;

-- Garantir que a coluna seja única
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_number_display_key;
ALTER TABLE public.proposals ADD CONSTRAINT proposals_number_display_key UNIQUE (number_display);

-- Criar a sequência para a numeração das propostas
CREATE SEQUENCE IF NOT EXISTS proposal_number_seq;

-- Função para formatar o número da proposta
CREATE OR REPLACE FUNCTION format_proposal_number(n BIGINT) RETURNS TEXT AS $$
BEGIN
    RETURN '#' || LPAD(n::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Função do trigger para preencher o number_display automaticamente
CREATE OR REPLACE FUNCTION public.set_proposal_number_display() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.number_display IS NULL THEN
        NEW.number_display := format_proposal_number(nextval('proposal_number_seq'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para novas propostas
DROP TRIGGER IF EXISTS tr_set_proposal_number ON public.proposals;
CREATE TRIGGER tr_set_proposal_number
BEFORE INSERT ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.set_proposal_number_display();

-- Atualização retroativa para propostas existentes
DO $$
DECLARE
    r RECORD;
    next_n BIGINT;
BEGIN
    -- Pegar o maior número existente que segue o padrão #0000 ou outros números, ignorando caracteres não numéricos após o prefixo inicial
    SELECT COALESCE(MAX(n), 0) + 1 INTO next_n 
    FROM (
        SELECT CAST(SUBSTRING(number_display FROM '[0-9]+') AS BIGINT) as n
        FROM public.proposals 
        WHERE number_display IS NOT NULL 
          AND number_display ~ '[0-9]'
    ) sub;
    
    -- Se não houver nada, começar de 1
    IF next_n IS NULL OR next_n = 0 THEN next_n := 1; END IF;
    
    -- Reiniciar a sequência para o valor correto
    PERFORM setval('proposal_number_seq', next_n - 1, true);

    -- Atualizar as propostas que não têm número (ou que não seguem o novo padrão se desejado, mas aqui focamos nas NULL)
    FOR r IN (SELECT id FROM public.proposals WHERE number_display IS NULL ORDER BY created_at ASC) LOOP
        UPDATE public.proposals 
        SET number_display = format_proposal_number(nextval('proposal_number_seq'))
        WHERE id = r.id;
    END LOOP;
END $$;
