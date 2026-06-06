-- Adiciona campo para assinatura da agência nas configurações
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS agency_signature_url TEXT;

-- Melhora a tabela de propostas para o fluxo de aprovação
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS approval_token UUID DEFAULT gen_random_uuid();

-- Garante que propostas existentes tenham tokens (public_token é UUID)
UPDATE public.proposals SET public_token = gen_random_uuid() WHERE public_token IS NULL;
UPDATE public.proposals SET approval_token = gen_random_uuid() WHERE approval_token IS NULL;

-- Índices para busca rápida em links públicos
CREATE INDEX IF NOT EXISTS idx_proposals_public_token ON public.proposals(public_token);
CREATE INDEX IF NOT EXISTS idx_proposals_approval_token ON public.proposals(approval_token);

-- Permissões para os novos campos
GRANT SELECT, UPDATE ON TABLE public.agency_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.proposals TO authenticated;
GRANT ALL ON TABLE public.proposals TO service_role;
GRANT ALL ON TABLE public.agency_settings TO service_role;
