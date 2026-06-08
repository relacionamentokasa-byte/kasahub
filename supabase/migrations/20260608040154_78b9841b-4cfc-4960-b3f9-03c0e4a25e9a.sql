CREATE OR REPLACE FUNCTION public.handle_job_comment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 DECLARE
   v_participant UUID;
   v_author_name TEXT;
   v_job_title TEXT;
   v_responsible_id UUID;
 BEGIN
   IF NEW.is_system = true THEN
     RETURN NEW;
   END IF;

   SELECT title, main_responsible_id INTO v_job_title, v_responsible_id FROM public.jobs WHERE id = NEW.job_id;
   SELECT COALESCE(display_name, full_name, 'Alguém') INTO v_author_name FROM public.profiles WHERE id = NEW.user_id;

   IF v_responsible_id IS NOT NULL AND v_responsible_id != NEW.user_id THEN
      PERFORM public.notify_user(
       v_responsible_id,
       'Novo comentário no job',
       v_author_name || ' comentou em: ' || v_job_title,
       'info',
       'comment',
       '/jobs?jobId=' || NEW.job_id,
       'job_comment',
       NEW.id
     );
   END IF;

   FOR v_participant IN (
     SELECT DISTINCT user_id FROM public.job_comments WHERE job_id = NEW.job_id AND user_id != NEW.user_id
   ) LOOP
     IF v_participant != COALESCE(v_responsible_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
       PERFORM public.notify_user(
         v_participant,
         'Novo comentário no job',
         v_author_name || ' comentou em: ' || v_job_title,
         'info',
         'comment',
         '/jobs?jobId=' || NEW.job_id,
         'job_comment',
         NEW.id
       );
     END IF;
   END LOOP;

   RETURN NEW;
 END;
 $function$;