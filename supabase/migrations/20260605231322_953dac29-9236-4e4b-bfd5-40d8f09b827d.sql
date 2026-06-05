-- 1. Alterar tabela proposals para suportar versionamento e cancelamento
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.proposals(id);
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS root_proposal_id UUID REFERENCES public.proposals(id);
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS cancellation_type TEXT; -- 'termination' | 'archiving'
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- 2. Criar tabela de timeline do cliente
CREATE TABLE IF NOT EXISTS public.client_timeline_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'lead_created', 'proposal_created', 'proposal_sent', 'proposal_approved', 'contract_generated', 'project_created', 'onboarding', 'operation', 'addendum', 'termination'
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    actor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Permissões para a nova tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_timeline_events TO authenticated;
GRANT ALL ON public.client_timeline_events TO service_role;
ALTER TABLE public.client_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timeline of their clients" ON public.client_timeline_events
    FOR SELECT USING (true);

CREATE POLICY "Users can insert timeline events" ON public.client_timeline_events
    FOR INSERT WITH CHECK (true);

-- 3. Garantir que contratos e projetos tenham os campos necessários para o fluxo de cancelamento
-- (Eles já possuem status, mas vamos garantir permissões e índices se necessário)
CREATE INDEX IF NOT EXISTS idx_proposals_root_id ON public.proposals(root_proposal_id);
CREATE INDEX IF NOT EXISTS idx_timeline_client_id ON public.client_timeline_events(client_id);
CREATE INDEX IF NOT EXISTS idx_timeline_lead_id ON public.client_timeline_events(lead_id);
