-- 1. Criação da tabela de Templates Operacionais
CREATE TABLE IF NOT EXISTS public.operational_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    default_steps JSONB DEFAULT '[]'::jsonb, -- Array de strings com os nomes das etapas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissões para operational_templates
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_templates TO authenticated;
GRANT ALL ON public.operational_templates TO service_role;
ALTER TABLE public.operational_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage operational templates" ON public.operational_templates FOR ALL USING (true);

-- 2. Limpeza de Fluxos Operacionais (Remoção de referências)
ALTER TABLE public.services DROP COLUMN IF EXISTS operational_flow_id;

-- 3. Atualização da tabela de Jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS operational_template_id UUID REFERENCES public.operational_templates(id) ON DELETE SET NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS main_responsible_id UUID REFERENCES auth.users(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS team_involved JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 4. Estágios do Kanban
INSERT INTO public.job_stages (id, name, color, order_index, is_done)
VALUES 
  ('70000000-0000-0000-0000-000000000001', '📥 Novas Demandas', 'text-blue-500', 0, false),
  ('70000000-0000-0000-0000-000000000002', '⚙️ Em Execução', 'text-amber-500', 1, false),
  ('70000000-0000-0000-0000-000000000003', '👤 Aguardando Cliente', 'text-purple-500', 2, false),
  ('70000000-0000-0000-0000-000000000004', '🏁 Concluído', 'text-emerald-500', 3, true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  color = EXCLUDED.color, 
  order_index = EXCLUDED.order_index, 
  is_done = EXCLUDED.is_done;

-- 5. Checklist e Progresso
ALTER TABLE public.job_checklist ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION public.calculate_job_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_steps INTEGER;
    completed_steps INTEGER;
    v_job_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_job_id := OLD.job_id;
    ELSE
        v_job_id := NEW.job_id;
    END IF;

    SELECT COUNT(*) INTO total_steps FROM public.job_checklist WHERE job_id = v_job_id;
    SELECT COUNT(*) INTO completed_steps FROM public.job_checklist WHERE job_id = v_job_id AND done = true;
    
    IF total_steps > 0 THEN
        UPDATE public.jobs 
        SET progress_percentage = (completed_steps * 100 / total_steps)
        WHERE id = v_job_id;
    ELSE
        UPDATE public.jobs 
        SET progress_percentage = 0
        WHERE id = v_job_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_job_progress ON public.job_checklist;
CREATE TRIGGER tr_update_job_progress
AFTER INSERT OR UPDATE OR DELETE ON public.job_checklist
FOR EACH ROW EXECUTE FUNCTION public.calculate_job_progress();

-- 6. Templates Iniciais
INSERT INTO public.operational_templates (name, description, default_steps)
VALUES 
  ('Calendário de Conteúdo', 'Template para gestão de calendário editorial', '["Planejamento Editorial", "Aprovação das Pautas", "Criação das Artes", "Criação das Legendas", "Aprovação Cliente", "Agendamento", "Publicação"]'::jsonb),
  ('Gestão de Tráfego', 'Template para campanhas de tráfego pago', '["Reunião Inicial", "Planejamento", "Configuração", "Publicação das Campanhas", "Otimizações", "Relatório"]'::jsonb),
  ('Identidade Visual', 'Template para criação de ID Visual', '["Briefing", "Pesquisa", "Conceito", "Desenvolvimento", "Aprovação", "Arquivos Finais"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET default_steps = EXCLUDED.default_steps;

-- 7. Trigger para atualização de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operational_templates_updated_at 
BEFORE UPDATE ON public.operational_templates 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
