-- Tabela de Logs de Auditoria
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'client', 'contract', 'job', etc.
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('ceo', 'gestor', 'admin')
        )
    );

-- Monitoramento de Inatividade em Jobs
ALTER TABLE public.jobs ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Função para atualizar last_activity_at
CREATE OR REPLACE FUNCTION public.update_job_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.jobs SET last_activity_at = now() WHERE id = NEW.job_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gatilhos para comentários e checklist
CREATE TRIGGER trigger_update_job_activity_on_comment
AFTER INSERT ON public.job_comments
FOR EACH ROW EXECUTE FUNCTION public.update_job_last_activity();

CREATE TRIGGER trigger_update_job_activity_on_checklist
AFTER INSERT OR UPDATE ON public.job_checklist
FOR EACH ROW EXECUTE FUNCTION public.update_job_last_activity();
