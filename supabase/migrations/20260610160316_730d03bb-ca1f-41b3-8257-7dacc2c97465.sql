-- 1. Garantir que a estrutura de notificações suporte o que foi pedido (avatar e nome do autor)
-- Vamos usar o campo metadata (JSONB) para armazenar informações extras se necessário, 
-- mas o RPC notify_user pode ser expandido ou usado como está se passarmos os dados formatados na descrição.

-- 2. Trigger para Atribuição de Job
CREATE OR REPLACE FUNCTION public.handle_job_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_author_name TEXT;
    v_author_avatar TEXT;
BEGIN
    -- Obter dados de quem atribuiu (quem criou ou atualizou o job)
    SELECT COALESCE(display_name, full_name, 'Alguém'), avatar_url 
    INTO v_author_name, v_author_avatar
    FROM public.profiles 
    WHERE id = auth.uid();

    -- Se for um novo job ou o assignee_id mudou
    IF (TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL) OR 
       (TG_OP = 'UPDATE' AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL) THEN
        
        -- Evitar auto-notificação
        IF NEW.assignee_id != auth.uid() THEN
            PERFORM public.notify_user(
                NEW.assignee_id,
                'Novo Job Atribuído',
                v_author_name || ' atribuiu a você o job: ' || NEW.title,
                'info',
                'job',
                '/jobs?jobId=' || NEW.id,
                'jobs',
                NEW.id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_job_assignment_notification ON public.jobs;
CREATE TRIGGER tr_job_assignment_notification
AFTER INSERT OR UPDATE OF assignee_id ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.handle_job_assignment_notification();

-- 3. Trigger para Comentários em Jobs
CREATE OR REPLACE FUNCTION public.handle_job_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_author_name TEXT;
    v_author_avatar TEXT;
    v_job_title TEXT;
    v_assignee_id UUID;
BEGIN
    -- Se for comentário do sistema, não notifica
    IF NEW.is_system THEN
        RETURN NEW;
    END IF;

    -- Obter dados do autor
    SELECT COALESCE(display_name, full_name, 'Alguém'), avatar_url 
    INTO v_author_name, v_author_avatar
    FROM public.profiles 
    WHERE id = NEW.user_id;

    -- Obter dados do Job
    SELECT title, assignee_id INTO v_job_title, v_assignee_id
    FROM public.jobs
    WHERE id = NEW.job_id;

    -- Notificar o responsável pelo Job (se não for o próprio autor do comentário)
    IF v_assignee_id IS NOT NULL AND v_assignee_id != NEW.user_id THEN
        PERFORM public.notify_user(
            v_assignee_id,
            'Novo Comentário',
            v_author_name || ' comentou no job: ' || v_job_title,
            'info',
            'comment',
            '/jobs?jobId=' || NEW.job_id,
            'jobs',
            NEW.job_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_job_comment_notification ON public.job_comments;
CREATE TRIGGER tr_job_comment_notification
AFTER INSERT ON public.job_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_job_comment_notification();

-- 4. Trigger para Mudança de Status em Jobs
CREATE OR REPLACE FUNCTION public.handle_job_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_author_name TEXT;
    v_status_label TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Obter dados de quem alterou
        SELECT COALESCE(display_name, full_name, 'Alguém') INTO v_author_name
        FROM public.profiles 
        WHERE id = auth.uid();

        -- Traduzir status (simplificado)
        v_status_label := CASE NEW.status 
            WHEN 'not_started' THEN 'Nova Demanda'
            WHEN 'in_progress' THEN 'Em Andamento'
            WHEN 'review' THEN 'Em Revisão'
            WHEN 'done' THEN 'Concluído'
            WHEN 'paused' THEN 'Pausado'
            ELSE NEW.status
        END;

        -- Notificar o responsável pelo Job
        IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != auth.uid() THEN
            PERFORM public.notify_user(
                NEW.assignee_id,
                'Mudança de Status',
                v_author_name || ' alterou o status do job "' || NEW.title || '" para: ' || v_status_label,
                'info',
                'job',
                '/jobs?jobId=' || NEW.id,
                'jobs',
                NEW.id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_job_status_notification ON public.jobs;
CREATE TRIGGER tr_job_status_notification
AFTER UPDATE OF status ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.handle_job_status_notification();

-- 5. Atualizar função de Prazo Próximo (1 dia antes)
-- Esta parte geralmente roda via cron, mas vamos ajustar a lógica para ser 1 dia antes
-- O cron atual parece pegar o dia atual. Vamos ajustar para incluir o dia seguinte.

CREATE OR REPLACE FUNCTION public.check_upcoming_deadlines()
RETURNS void AS $$
DECLARE
    v_tomorrow DATE := CURRENT_DATE + INTERVAL '1 day';
    v_job RECORD;
BEGIN
    FOR v_job IN 
        SELECT id, title, assignee_id 
        FROM public.jobs 
        WHERE due_date = v_tomorrow 
        AND done_at IS NULL 
        AND assignee_id IS NOT NULL
    LOOP
        PERFORM public.notify_user(
            v_job.assignee_id,
            'Prazo Próximo',
            'O job "' || v_job.title || '" vence amanhã!',
            'alert',
            'agenda',
            '/jobs?jobId=' || v_job.id,
            'jobs',
            v_job.id
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
