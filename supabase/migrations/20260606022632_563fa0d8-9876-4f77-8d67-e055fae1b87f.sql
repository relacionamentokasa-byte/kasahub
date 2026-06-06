-- Tabela principal de Fluxos Operacionais
CREATE TABLE public.operational_flows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    default_project_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Etapas do Fluxo
CREATE TABLE public.operational_flow_stages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    flow_id UUID NOT NULL REFERENCES public.operational_flows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Jobs (Tarefas) do Fluxo
CREATE TABLE public.operational_flow_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    stage_id UUID NOT NULL REFERENCES public.operational_flow_stages(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    job_type TEXT,
    default_assignee_role_id UUID REFERENCES public.custom_roles(id), -- Referência a custom_roles
    sla_days INTEGER DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Checklist do Job do Fluxo
CREATE TABLE public.operational_flow_checklists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    flow_job_id UUID NOT NULL REFERENCES public.operational_flow_jobs(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dependências entre Jobs do Fluxo
CREATE TABLE public.operational_flow_dependencies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    flow_job_id UUID NOT NULL REFERENCES public.operational_flow_jobs(id) ON DELETE CASCADE,
    depends_on_job_id UUID NOT NULL REFERENCES public.operational_flow_jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna de fluxo operacional na tabela de serviços
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'services' AND column_name = 'operational_flow_id') THEN
        ALTER TABLE public.services ADD COLUMN operational_flow_id UUID REFERENCES public.operational_flows(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Triggers para updated_at (reutilizando a função se já existir, senão cria)
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operational_flows_updated_at BEFORE UPDATE ON public.operational_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_operational_flow_stages_updated_at BEFORE UPDATE ON public.operational_flow_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_operational_flow_jobs_updated_at BEFORE UPDATE ON public.operational_flow_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.operational_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_flow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_flow_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_flow_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_flow_dependencies ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_flows TO authenticated;
GRANT ALL ON public.operational_flows TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_flow_stages TO authenticated;
GRANT ALL ON public.operational_flow_stages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_flow_jobs TO authenticated;
GRANT ALL ON public.operational_flow_jobs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_flow_checklists TO authenticated;
GRANT ALL ON public.operational_flow_checklists TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_flow_dependencies TO authenticated;
GRANT ALL ON public.operational_flow_dependencies TO service_role;

-- Políticas Básicas
CREATE POLICY "Users can view operational flows" ON public.operational_flows FOR SELECT USING (true);
CREATE POLICY "Users can manage operational flows" ON public.operational_flows FOR ALL USING (true);

CREATE POLICY "Users can view stages" ON public.operational_flow_stages FOR SELECT USING (true);
CREATE POLICY "Users can manage stages" ON public.operational_flow_stages FOR ALL USING (true);

CREATE POLICY "Users can view jobs" ON public.operational_flow_jobs FOR SELECT USING (true);
CREATE POLICY "Users can manage jobs" ON public.operational_flow_jobs FOR ALL USING (true);

CREATE POLICY "Users can view checklists" ON public.operational_flow_checklists FOR SELECT USING (true);
CREATE POLICY "Users can manage checklists" ON public.operational_flow_checklists FOR ALL USING (true);

CREATE POLICY "Users can view dependencies" ON public.operational_flow_dependencies FOR SELECT USING (true);
CREATE POLICY "Users can manage dependencies" ON public.operational_flow_dependencies FOR ALL USING (true);