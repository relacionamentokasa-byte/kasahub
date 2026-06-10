-- Migração para converter scope_text em JSONB
-- Primeiro, criamos uma função temporária para tentar converter o texto atual em um array JSON
CREATE OR REPLACE FUNCTION public.text_to_jsonb_array(t text) RETURNS jsonb AS $$
BEGIN
  IF t IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Se já parecer um JSON array, tenta parsear
  IF t ~ '^\s*\[.*\]\s*$' THEN
    BEGIN
      RETURN t::jsonb;
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar o parse, trata como texto comum abaixo
    END;
  END IF;

  -- Divide por linhas e converte em array JSON
  RETURN (
    SELECT jsonb_agg(line)
    FROM (
      SELECT trim(replace(line, '- ', '')) as line
      FROM unnest(string_to_array(t, E'\n')) as line
      WHERE trim(line) <> ''
    ) s
  );
END;
$$ LANGUAGE plpgsql;

-- Altera a coluna
ALTER TABLE public.proposals 
ALTER COLUMN scope_text TYPE jsonb 
USING public.text_to_jsonb_array(scope_text);

-- Remove a função temporária
DROP FUNCTION public.text_to_jsonb_array(text);
