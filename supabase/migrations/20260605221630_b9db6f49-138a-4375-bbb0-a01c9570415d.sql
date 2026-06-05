-- Modelos de Contrato
CREATE TABLE public.contract_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Conteúdo com variáveis {{cliente}}, {{valor}}, etc.
    is_active BOOLEAN NOT NULL DEFAULT true,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    owner_id UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage contract templates" ON public.contract_templates
    FOR ALL USING (true) WITH CHECK (true);

-- Vincular serviço a um modelo de contrato padrão
ALTER TABLE public.services ADD COLUMN contract_template_id UUID REFERENCES public.contract_templates(id);

-- Campos de contrato e assinatura na Proposta
ALTER TABLE public.proposals ADD COLUMN contract_template_id UUID REFERENCES public.contract_templates(id);
ALTER TABLE public.proposals ADD COLUMN contract_content TEXT;
ALTER TABLE public.proposals ADD COLUMN signature_client TEXT;
ALTER TABLE public.proposals ADD COLUMN signature_agency TEXT;
ALTER TABLE public.proposals ADD COLUMN signed_at_client TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.proposals ADD COLUMN signed_at_agency TIMESTAMP WITH TIME ZONE;

-- Trigger para updated_at em contract_templates
CREATE TRIGGER update_contract_templates_updated_at BEFORE UPDATE ON public.contract_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
