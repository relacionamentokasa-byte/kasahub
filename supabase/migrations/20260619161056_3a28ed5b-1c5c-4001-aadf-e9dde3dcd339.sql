CREATE OR REPLACE FUNCTION public.handle_job_assignment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_author_name TEXT;
    v_actor UUID := auth.uid();
    v_member JSONB;
    v_member_id UUID;
    v_old_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    SELECT COALESCE(display_name, full_name, 'Alguém')
      INTO v_author_name
      FROM public.profiles
     WHERE id = v_actor;
    v_author_name := COALESCE(v_author_name, 'Alguém');

    -- assignee (legado)
    IF NEW.assignee_id IS NOT NULL
       AND NEW.assignee_id <> COALESCE(v_actor, '00000000-0000-0000-0000-000000000000'::uuid)
       AND (TG_OP = 'INSERT' OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id) THEN
        INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
        VALUES (
            NEW.assignee_id,
            v_author_name || ' atribuiu um job a você',
            'Novo job sob sua responsabilidade: ' || NEW.title,
            'assignment',
            '/jobs?jobId=' || NEW.id
        );
    END IF;

    -- main_responsible_id
    IF NEW.main_responsible_id IS NOT NULL
       AND NEW.main_responsible_id <> COALESCE(v_actor, '00000000-0000-0000-0000-000000000000'::uuid)
       AND NEW.main_responsible_id <> COALESCE(NEW.assignee_id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND (TG_OP = 'INSERT' OR NEW.main_responsible_id IS DISTINCT FROM OLD.main_responsible_id) THEN
        INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
        VALUES (
            NEW.main_responsible_id,
            v_author_name || ' definiu você como responsável',
            'Você é o responsável principal pelo job: ' || NEW.title,
            'assignment',
            '/jobs?jobId=' || NEW.id
        );
    END IF;

    -- team_involved (novos membros)
    IF NEW.team_involved IS NOT NULL AND jsonb_typeof(NEW.team_involved) = 'array' THEN
        IF TG_OP = 'UPDATE' AND OLD.team_involved IS NOT NULL AND jsonb_typeof(OLD.team_involved) = 'array' THEN
            SELECT COALESCE(array_agg(DISTINCT (m->>'user_id')::uuid), ARRAY[]::UUID[])
              INTO v_old_ids
              FROM jsonb_array_elements(OLD.team_involved) m
             WHERE (m->>'user_id') IS NOT NULL;
        END IF;

        FOR v_member IN SELECT * FROM jsonb_array_elements(NEW.team_involved)
        LOOP
            BEGIN
                v_member_id := (v_member->>'user_id')::uuid;
            EXCEPTION WHEN OTHERS THEN
                v_member_id := NULL;
            END;

            IF v_member_id IS NULL THEN CONTINUE; END IF;
            IF v_member_id = v_actor THEN CONTINUE; END IF;
            IF v_member_id = ANY(v_old_ids) THEN CONTINUE; END IF;
            IF v_member_id = NEW.main_responsible_id THEN CONTINUE; END IF;
            IF v_member_id = NEW.assignee_id THEN CONTINUE; END IF;

            INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
            VALUES (
                v_member_id,
                v_author_name || ' adicionou você a um job',
                'Você foi incluído na equipe do job: ' || NEW.title,
                'assignment',
                '/jobs?jobId=' || NEW.id
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;