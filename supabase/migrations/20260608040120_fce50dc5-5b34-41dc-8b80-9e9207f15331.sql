CREATE OR REPLACE FUNCTION public.handle_job_assignment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 DECLARE
   v_assigner_name TEXT;
 BEGIN
   IF (TG_OP = 'UPDATE' AND NEW.main_responsible_id IS DISTINCT FROM OLD.main_responsible_id AND NEW.main_responsible_id IS NOT NULL) OR (TG_OP = 'INSERT' AND NEW.main_responsible_id IS NOT NULL) THEN
     PERFORM public.notify_user(
       NEW.main_responsible_id,
       'Novo job atribuído',
       'Você foi definido como responsável pelo job: ' || NEW.title,
       'info',
       'job',
       '/jobs?jobId=' || NEW.id,
       'job',
       NEW.id
     );
   END IF;
   RETURN NEW;
 END;
 $function$;