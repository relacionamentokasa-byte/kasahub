
-- Coluna pra armazenar o anexo da proposta assinada externamente (Operand, etc)
ALTER TABLE public.proposals 
  ADD COLUMN IF NOT EXISTS external_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS external_signature_filename TEXT;

-- Atualiza a validação: aceita assinatura interna OU comprovante externo anexado
CREATE OR REPLACE FUNCTION public.validate_proposal_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.status IN ('accepted', 'converted', 'signed', 'Aprovada'))
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF (
      (NEW.signature_client IS NULL OR length(trim(NEW.signature_client)) = 0)
      AND (NEW.client_signature_data IS NULL OR length(trim(NEW.client_signature_data)) = 0)
      AND (NEW.external_signature_url IS NULL OR length(trim(NEW.external_signature_url)) = 0)
    ) THEN
      RAISE EXCEPTION 'Esta proposta não pode ser aprovada sem a assinatura digital do cliente ou um comprovante de assinatura externa anexado.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
