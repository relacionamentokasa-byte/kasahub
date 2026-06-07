ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS client_cpf TEXT,
ADD COLUMN IF NOT EXISTS client_role TEXT,
ADD COLUMN IF NOT EXISTS client_signed_email TEXT,
ADD COLUMN IF NOT EXISTS client_signature_data TEXT,
ADD COLUMN IF NOT EXISTS signed_metadata JSONB;

COMMENT ON COLUMN public.proposals.client_signature_data IS 'Base64 image of the digital signature';
COMMENT ON COLUMN public.proposals.signed_metadata IS 'Metadata captured during signature: IP, Browser, Device, etc';
