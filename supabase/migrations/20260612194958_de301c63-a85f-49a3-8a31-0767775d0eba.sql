CREATE OR REPLACE FUNCTION public.validate_proposal_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Enforce only when entering an approved status (insert or transition),
  -- so edits to legacy already-approved rows are not blocked.
  IF (NEW.status IN ('accepted', 'converted', 'signed', 'Aprovada'))
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF (
      (NEW.signature_client IS NULL OR length(trim(NEW.signature_client)) = 0)
      AND (NEW.client_signature_data IS NULL OR length(trim(NEW.client_signature_data)) = 0)
    ) THEN
      RAISE EXCEPTION 'Esta proposta não pode ser aprovada sem a assinatura digital do cliente. Envie o link público para o cliente assinar.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;