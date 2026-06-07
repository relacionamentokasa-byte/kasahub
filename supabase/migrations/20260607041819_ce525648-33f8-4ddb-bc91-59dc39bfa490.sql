CREATE OR REPLACE FUNCTION public.validate_proposal_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the status is being changed to an approved/signed/converted state
  IF (NEW.status IN ('accepted', 'converted', 'signed')) THEN
    -- If there is no signature, block the update
    IF (NEW.signature_client IS NULL OR length(trim(NEW.signature_client)) = 0) THEN
      RAISE EXCEPTION 'Esta proposta não possui a assinatura digital do cliente e não pode ser aprovada manualmente.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS trigger_validate_proposal_approval ON public.proposals;

-- Create the trigger
CREATE TRIGGER trigger_validate_proposal_approval
BEFORE INSERT OR UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.validate_proposal_approval();

-- Re-grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
