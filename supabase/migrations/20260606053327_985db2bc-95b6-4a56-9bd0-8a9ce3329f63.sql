-- Adicionar campos de integração Google ao perfil
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- Criar tabela de eventos do calendário se não existir
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id),
    project_id UUID REFERENCES public.projects(id),
    approval_id UUID, -- Referência manual para simplificar se a tabela approvals for dinâmica
    title TEXT NOT NULL,
    description TEXT,
    kind TEXT DEFAULT 'other', -- post, meeting, deadline, task, other
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT false,
    color TEXT,
    external_id TEXT, -- ID do Google Calendar
    source TEXT DEFAULT 'manual', -- manual, google, system
    origin_type TEXT, -- job, contract, finance, dme, approval
    origin_id UUID, -- ID do registro de origem
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS e permissões
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

-- Políticas de RLS
CREATE POLICY "Usuários autenticados podem ver todos os eventos" ON public.calendar_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários podem gerenciar seus próprios eventos" ON public.calendar_events FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
