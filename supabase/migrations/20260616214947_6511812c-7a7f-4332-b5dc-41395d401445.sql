
ALTER TABLE public.job_comments
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS job_comments_job_internal_idx
  ON public.job_comments (job_id, is_internal, created_at DESC);

-- Notify every mentioned user (works for internal notes and regular comments)
CREATE OR REPLACE FUNCTION public.handle_job_mention_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_author_name TEXT;
    v_author_avatar TEXT;
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

    SELECT COALESCE(display_name, full_name, 'Alguém'), avatar_url
      INTO v_author_name, v_author_avatar
      FROM public.profiles
      WHERE id = NEW.user_id;

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
        PERFORM public.notify_user(
          v_mention_id,
          CASE WHEN NEW.is_internal THEN 'Você foi mencionado em uma observação interna'
               ELSE 'Você foi mencionado em um comentário' END,
          v_author_name || ' mencionou você no job: ' || COALESCE(v_job_title, ''),
          'info',
          'mention',
          '/jobs?jobId=' || NEW.job_id,
          'jobs',
          NEW.job_id,
          jsonb_build_object('author_name', v_author_name, 'author_avatar', v_author_avatar)
        );
      END IF;
    END LOOP;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_job_mention_notification ON public.job_comments;
CREATE TRIGGER tr_job_mention_notification
AFTER INSERT ON public.job_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_job_mention_notification();
