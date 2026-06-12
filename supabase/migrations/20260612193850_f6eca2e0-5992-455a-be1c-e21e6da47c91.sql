CREATE OR REPLACE FUNCTION public.validate_proposal_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF (NEW.status IN ('accepted', 'converted', 'signed', 'Aprovada')) THEN
    IF (
      (NEW.signature_client IS NULL OR length(trim(NEW.signature_client)) = 0)
      AND (NEW.client_signature_data IS NULL OR length(trim(NEW.client_signature_data)) = 0)
      AND NEW.accepted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Esta proposta não pode ser aprovada sem a assinatura digital do cliente. Envie o link público para o cliente assinar.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_validate_proposal_approval ON public.proposals;
CREATE TRIGGER trigger_validate_proposal_approval
BEFORE INSERT OR UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.validate_proposal_approval();