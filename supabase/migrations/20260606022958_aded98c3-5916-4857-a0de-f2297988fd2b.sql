-- Adicionar coluna de status se não existir (parece que o sistema usa stage_id, mas o usuário quer status explícitos)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'review', 'adjustments', 'done', 'cancelled'));

-- Adicionar campos de Briefing e Campos Personalizados na tabela de Jobs
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS briefing_objective TEXT,
ADD COLUMN IF NOT EXISTS briefing_guidelines TEXT,
ADD COLUMN IF NOT EXISTS briefing_notes TEXT,
ADD COLUMN IF NOT EXISTS briefing_references TEXT,
ADD COLUMN IF NOT EXISTS briefing_links TEXT[],
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS approval_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS last_feedback TEXT,
ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMP WITH TIME ZONE;

-- Tabela de Histórico do Job
CREATE TABLE IF NOT EXISTS public.job_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, 
    from_value TEXT,
    to_value TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Anexos (Nível Job)
CREATE TABLE IF NOT EXISTS public.job_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    category TEXT DEFAULT 'execution',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT ON public.job_history TO authenticated;
GRANT ALL ON public.job_history TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_attachments TO authenticated;
GRANT ALL ON public.job_attachments TO service_role;

-- Políticas
CREATE POLICY "Users can view job history" ON public.job_history FOR SELECT USING (true);
CREATE POLICY "Users can insert job history" ON public.job_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage job attachments" ON public.job_attachments FOR ALL USING (true);

-- Trigger para registrar histórico
CREATE OR REPLACE FUNCTION public.fn_log_job_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.job_history (job_id, action, from_value, to_value)
            VALUES (NEW.id, 'status_change', OLD.status, NEW.status);
        END IF;
        
        IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
            INSERT INTO public.job_history (job_id, action, from_value, to_value)
            VALUES (NEW.id, 'assignee_change', OLD.assignee_id::text, NEW.assignee_id::text);
        END IF;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.job_history (job_id, action)
        VALUES (NEW.id, 'created');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_job_changes ON public.jobs;
CREATE TRIGGER tr_log_job_changes
AFTER INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.fn_log_job_changes();