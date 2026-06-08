-- Enable Realtime for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Drop and recreate notify_user with consistent signature
DROP FUNCTION IF EXISTS public.notify_user(uuid,text,text,text,text,text,text,uuid);
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'info',
  p_category TEXT DEFAULT 'general',
  p_link TEXT DEFAULT NULL,
  p_origin_type TEXT DEFAULT NULL,
  p_origin_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, title, description, type, category, link, origin_type, origin_id
  ) VALUES (
    p_user_id, p_title, p_description, p_type, p_category, p_link, p_origin_type, p_origin_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Job Assignment
CREATE OR REPLACE FUNCTION public.handle_job_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_assigner_name TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.responsible_id IS DISTINCT FROM OLD.responsible_id AND NEW.responsible_id IS NOT NULL) OR (TG_OP = 'INSERT' AND NEW.responsible_id IS NOT NULL) THEN
    PERFORM public.notify_user(
      NEW.responsible_id,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_job_assignment ON public.jobs;
CREATE TRIGGER on_job_assignment
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_job_assignment_notification();

-- Trigger for Job Status Change
CREATE OR REPLACE FUNCTION public.handle_job_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_participant UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.responsible_id IS NOT NULL AND NEW.responsible_id != auth.uid() THEN
      PERFORM public.notify_user(
        NEW.responsible_id,
        'Status do job alterado',
        'O job "' || NEW.title || '" mudou para: ' || NEW.status,
        'info',
        'job',
        '/jobs?jobId=' || NEW.id,
        'job',
        NEW.id
      );
    END IF;

    FOR v_participant IN (
      SELECT DISTINCT user_id FROM public.job_comments WHERE job_id = NEW.id AND user_id != auth.uid()
      UNION
      SELECT DISTINCT user_id FROM public.job_checklist WHERE job_id = NEW.id AND user_id != auth.uid()
    ) LOOP
      IF v_participant != COALESCE(NEW.responsible_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        PERFORM public.notify_user(
          v_participant,
          'Status do job alterado',
          'O job "' || NEW.title || '" mudou para: ' || NEW.status,
          'info',
          'job',
          '/jobs?jobId=' || NEW.id,
          'job',
          NEW.id
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_job_status_change ON public.jobs;
CREATE TRIGGER on_job_status_change
  AFTER UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_job_status_notification();

-- Trigger for New Comments
CREATE OR REPLACE FUNCTION public.handle_job_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_participant UUID;
  v_author_name TEXT;
  v_job_title TEXT;
  v_responsible_id UUID;
BEGIN
  IF NEW.is_system = true THEN
    RETURN NEW;
  END IF;

  SELECT title, responsible_id INTO v_job_title, v_responsible_id FROM public.jobs WHERE id = NEW.job_id;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_job_comment ON public.job_comments;
CREATE TRIGGER on_job_comment
  AFTER INSERT ON public.job_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_job_comment_notification();

-- Trigger for Payment Confirmation
CREATE OR REPLACE FUNCTION public.handle_payment_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    IF NEW.owner_id IS NOT NULL AND NEW.owner_id != auth.uid() THEN
      PERFORM public.notify_user(
        NEW.owner_id,
        'Pagamento confirmado',
        'O lançamento "' || NEW.description || '" foi marcado como pago.',
        'info',
        'finance',
        '/finance',
        'transaction',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payment_confirmed ON public.transactions;
CREATE TRIGGER on_payment_confirmed
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_payment_notification();

-- Financial Health Check Function
CREATE OR REPLACE FUNCTION public.check_financial_notifications()
RETURNS VOID AS $$
BEGIN
  -- 5. Vencendo em breve (3 dias antes)
  INSERT INTO public.notifications (user_id, title, description, type, category, link, origin_type, origin_id)
  SELECT 
    owner_id, 
    'Lançamento vencendo em breve', 
    'O lançamento "' || description || '" vence em 3 dias.', 
    'alert', 
    'finance', 
    '/finance', 
    'transaction', 
    id
  FROM public.transactions
  WHERE status = 'pending' 
    AND due_date = (CURRENT_DATE + INTERVAL '3 days')::DATE
    AND owner_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE origin_id = public.transactions.id 
      AND category = 'finance' 
      AND title = 'Lançamento vencendo em breve'
    );

  -- 6. Lançamento vencido (dia seguinte ao vencimento)
  INSERT INTO public.notifications (user_id, title, description, type, category, link, origin_type, origin_id)
  SELECT 
    owner_id, 
    'Lançamento vencido', 
    'O lançamento "' || description || '" venceu ontem e continua pendente.', 
    'critical', 
    'finance', 
    '/finance', 
    'transaction', 
    id
  FROM public.transactions
  WHERE status = 'pending' 
    AND due_date = (CURRENT_DATE - INTERVAL '1 day')::DATE
    AND owner_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE origin_id = public.transactions.id 
      AND category = 'finance' 
      AND title = 'Lançamento vencido'
    );

  -- 9. Cliente em atraso (> 3 dias)
  INSERT INTO public.notifications (user_id, title, description, type, category, link, origin_type, origin_id)
  SELECT 
    owner_id, 
    'Cliente em atraso', 
    'O cliente tem faturas vencidas há mais de 3 dias: "' || description || '".', 
    'critical', 
    'finance', 
    '/finance', 
    'transaction', 
    id
  FROM public.transactions
  WHERE status = 'pending' 
    AND kind = 'income'
    AND due_date = (CURRENT_DATE - INTERVAL '3 days')::DATE
    AND owner_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE origin_id = public.transactions.id 
      AND category = 'finance' 
      AND title = 'Cliente em atraso'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
