CREATE OR REPLACE FUNCTION public.notify_user(
    p_user_id uuid,
    p_title text,
    p_description text DEFAULT NULL::text,
    p_type text DEFAULT 'info'::text,
    p_category text DEFAULT 'general'::text,
    p_link text DEFAULT NULL::text,
    p_origin_type text DEFAULT NULL::text,
    p_origin_id uuid DEFAULT NULL::uuid,
    p_metadata jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (
        user_id,
        title,
        description,
        type,
        category,
        link,
        origin_type,
        origin_id,
        metadata
    ) VALUES (
        p_user_id,
        p_title,
        p_description,
        p_type,
        p_category,
        p_link,
        p_origin_type,
        p_origin_id,
        p_metadata
    );
END;
$$;

-- Atualizar triggers para incluir metadata
CREATE OR REPLACE FUNCTION public.handle_job_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_author_name TEXT;
    v_author_avatar TEXT;
BEGIN
    SELECT COALESCE(display_name, full_name, 'Alguém'), avatar_url 
    INTO v_author_name, v_author_avatar
    FROM public.profiles 
    WHERE id = auth.uid();

    IF (TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL) OR 
       (TG_OP = 'UPDATE' AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL) THEN
        
        IF NEW.assignee_id != auth.uid() THEN
            PERFORM public.notify_user(
                NEW.assignee_id,
                'Novo Job Atribuído',
                v_author_name || ' atribuiu a você o job: ' || NEW.title,
                'info',
                'job',
                '/jobs?jobId=' || NEW.id,
                'jobs',
                NEW.id,
                jsonb_build_object('author_name', v_author_name, 'author_avatar', v_author_avatar)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_job_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_author_name TEXT;
    v_author_avatar TEXT;
    v_job_title TEXT;
    v_assignee_id UUID;
BEGIN
    IF NEW.is_system THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, full_name, 'Alguém'), avatar_url 
    INTO v_author_name, v_author_avatar
    FROM public.profiles 
    WHERE id = NEW.user_id;

    SELECT title, assignee_id INTO v_job_title, v_assignee_id
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF v_assignee_id IS NOT NULL AND v_assignee_id != NEW.user_id THEN
        PERFORM public.notify_user(
            v_assignee_id,
            'Novo Comentário',
            v_author_name || ' comentou no job: ' || v_job_title,
            'info',
            'comment',
            '/jobs?jobId=' || NEW.job_id,
            'jobs',
            NEW.job_id,
            jsonb_build_object('author_name', v_author_name, 'author_avatar', v_author_avatar)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_job_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_author_name TEXT;
    v_author_avatar TEXT;
    v_status_label TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        SELECT COALESCE(display_name, full_name, 'Alguém'), avatar_url 
        INTO v_author_name, v_author_avatar
        FROM public.profiles 
        WHERE id = auth.uid();

        v_status_label := CASE NEW.status 
            WHEN 'not_started' THEN 'Nova Demanda'
            WHEN 'in_progress' THEN 'Em Andamento'
            WHEN 'review' THEN 'Em Revisão'
            WHEN 'done' THEN 'Concluído'
            WHEN 'paused' THEN 'Pausado'
            ELSE NEW.status
        END;

        IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != auth.uid() THEN
            PERFORM public.notify_user(
                NEW.assignee_id,
                'Mudança de Status',
                v_author_name || ' alterou o status do job "' || NEW.title || '" para: ' || v_status_label,
                'info',
                'job',
                '/jobs?jobId=' || NEW.id,
                'jobs',
                NEW.id,
                jsonb_build_object('author_name', v_author_name, 'author_avatar', v_author_avatar)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
