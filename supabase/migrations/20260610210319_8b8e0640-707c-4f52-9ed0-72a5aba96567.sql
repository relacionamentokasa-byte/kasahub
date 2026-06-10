-- Update notify_user function to include metadata
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
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Ensure RLS is enabled and correct on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;
CREATE POLICY "Users can see their own notifications" ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
