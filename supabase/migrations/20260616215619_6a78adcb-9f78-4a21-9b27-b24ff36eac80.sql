
CREATE OR REPLACE FUNCTION public.handle_job_mention_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_job_title TEXT;
    v_mention_id UUID;
    v_mention JSONB;
BEGIN
    IF NEW.is_system THEN
      RETURN NEW;
    END IF;

    IF NEW.mentions IS NULL OR jsonb_array_length(NEW.mentions) = 0 THEN
      RETURN NEW;
    END IF;

    SELECT title INTO v_job_title FROM public.jobs WHERE id = NEW.job_id;

    FOR v_mention IN SELECT * FROM jsonb_array_elements(NEW.mentions)
    LOOP
      BEGIN
        IF jsonb_typeof(v_mention) = 'string' THEN
          v_mention_id := (v_mention #>> '{}')::uuid;
        ELSE
          v_mention_id := COALESCE(
            (v_mention->>'user_id')::uuid,
            (v_mention->>'id')::uuid
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_mention_id := NULL;
      END;

      IF v_mention_id IS NOT NULL AND v_mention_id <> COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
        VALUES (
          v_mention_id,
          CASE WHEN NEW.is_internal THEN 'Você foi mencionado em uma observação interna'
               ELSE 'Você foi mencionado em um comentário' END,
          'Você foi mencionado no job: ' || COALESCE(v_job_title, ''),
          'mention',
          '/jobs?jobId=' || NEW.job_id
        );
      END IF;
    END LOOP;

    RETURN NEW;
END;
$function$;
