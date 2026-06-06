-- Criar tabela de metas/indicadores
CREATE TABLE IF NOT EXISTS public.agency_indicators (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- commercial, financial, operational, clients
    type TEXT NOT NULL, -- monetary, quantity, percentage
    target_value NUMERIC(15,2) NOT NULL,
    periodicity TEXT NOT NULL, -- monthly, quarterly, semiannual, yearly
    start_date DATE NOT NULL,
    end_date DATE,
    responsible TEXT NOT NULL, -- company, commercial, financial, operations, board
    data_source TEXT NOT NULL, -- manual, contracts_mrr, contracts_count, proposals_accepted, extra_income, jobs_done, projects_finished, clients_active, clients_new
    status TEXT DEFAULT 'active', -- active, inactive, archived
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.agency_indicators ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_indicators TO authenticated;
GRANT ALL ON public.agency_indicators TO service_role;

-- Políticas de RLS
CREATE POLICY "Qualquer usuário autenticado pode ver as metas" ON public.agency_indicators FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gestores podem gerenciar metas" ON public.agency_indicators FOR ALL USING (
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

-- Trigger para updated_at
CREATE TRIGGER update_agency_indicators_updated_at BEFORE UPDATE ON public.agency_indicators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
