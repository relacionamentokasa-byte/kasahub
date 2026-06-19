CREATE OR REPLACE FUNCTION public.handle_job_assignment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
                v_author_name || ' atribuiu um job a você',
                'Novo job sob sua responsabilidade: ' || NEW.title,
                'assignment',
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
$function$;