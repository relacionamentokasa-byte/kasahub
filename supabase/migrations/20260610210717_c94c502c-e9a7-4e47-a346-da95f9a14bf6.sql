-- First, drop the ambiguous functions
DROP FUNCTION IF EXISTS public.notify_user(uuid, text, text, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.notify_user(uuid, text, text, text, text, text, text, uuid, jsonb);

-- Enable replication for notifications to support Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;

-- Create the single, canonical notify_user function
CREATE OR REPLACE FUNCTION public.notify_user(
    p_user_id uuid, 
    p_title text, 
    p_description text DEFAULT NULL, 
    p_type text DEFAULT 'info', 
    p_category text DEFAULT 'general', 
    p_link text DEFAULT NULL, 
    p_origin_type text DEFAULT NULL, 
    p_origin_id uuid DEFAULT NULL, 
    p_metadata jsonb DEFAULT NULL
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
        metadata,
        is_read,
        is_archived,
        created_at
    ) VALUES (
        p_user_id,
        p_title,
        p_description,
        p_type,
        p_category,
        p_link,
        p_origin_type,
        p_origin_id,
        p_metadata,
        false,
        false,
        now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_user TO service_role;

-- Clean up and simplify RLS policies
DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias notificações" ON public.notifications;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias notificações" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;

CREATE POLICY "notifications_select_policy" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_policy" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_policy" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_policy" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
