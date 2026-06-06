-- Criar tabela de parceiros
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL, -- representative, freelancer, supplier, strategic
    name TEXT NOT NULL,
    photo_url TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    document TEXT, -- CPF/CNPJ
    city TEXT,
    pix_key TEXT,
    bank_info TEXT,
    status TEXT DEFAULT 'active', -- active, inactive
    observations TEXT,
    
    -- Campos específicos para Representantes
    commission_type TEXT, -- percentage, fixed, custom
    commission_value NUMERIC(10,2),
    
    -- Campos específicos para Freelancers
    specialty TEXT,
    hourly_rate NUMERIC(10,2),
    project_rate NUMERIC(10,2),
    availability TEXT,
    
    -- Campos específicos para Fornecedores e Estratégicos
    company_name TEXT,
    responsible_name TEXT,
    partnership_type TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS e Permissões
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;

-- Políticas de RLS para parceiros
CREATE POLICY "Usuários autenticados podem ver todos os parceiros" ON public.partners FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Administradores e gestores podem gerenciar parceiros" ON public.partners FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'gestor', 'ceo')
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'gestor', 'ceo')
    )
);

-- Adicionar colunas de integração em outras tabelas
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS origin_partner_id UUID REFERENCES public.partners(id);
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS freelancer_id UUID REFERENCES public.partners(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id);

-- Trigger para updated_at na tabela partners
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar conta a pagar automática de comissão (Simples)
CREATE OR REPLACE FUNCTION public.generate_commission_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
    v_commission_type TEXT;
    v_commission_value NUMERIC;
    v_amount NUMERIC;
BEGIN
    -- Só processa se for recebimento de contrato
    IF NEW.kind = 'income' AND NEW.status = 'paid' AND NEW.contract_id IS NOT NULL THEN
        -- Busca o parceiro vinculado ao contrato
        SELECT partner_id INTO v_partner_id FROM public.contracts WHERE id = NEW.contract_id;
        
        IF v_partner_id IS NOT NULL THEN
            -- Busca as regras de comissão do parceiro
            SELECT commission_type, commission_value INTO v_commission_type, v_commission_value 
            FROM public.partners WHERE id = v_partner_id;
            
            IF v_commission_value > 0 THEN
                IF v_commission_type = 'percentage' THEN
                    v_amount := (NEW.amount * v_commission_value) / 100;
                ELSE
                    v_amount := v_commission_value;
                END IF;
                
                -- Gera conta a pagar
                INSERT INTO public.transactions (
                    description,
                    amount,
                    kind,
                    status,
                    due_date,
                    client_id,
                    contract_id,
                    partner_id,
                    owner_id
                ) VALUES (
                    'Comissão: ' || NEW.description,
                    v_amount,
                    'expense',
                    'pending',
                    CURRENT_DATE + INTERVAL '7 days',
                    NEW.client_id,
                    NEW.contract_id,
                    v_partner_id,
                    NEW.owner_id
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_generate_commission AFTER UPDATE ON public.transactions
FOR EACH ROW WHEN (OLD.status <> 'paid' AND NEW.status = 'paid')
EXECUTE FUNCTION public.generate_commission_transaction();
