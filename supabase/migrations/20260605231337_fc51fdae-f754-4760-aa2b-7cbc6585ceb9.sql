-- Ajustar políticas para serem mais seguras
DROP POLICY IF EXISTS "Users can view timeline of their clients" ON public.client_timeline_events;
DROP POLICY IF EXISTS "Users can insert timeline events" ON public.client_timeline_events;

CREATE POLICY "Users can view timeline events" ON public.client_timeline_events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert timeline events" ON public.client_timeline_events
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id OR actor_id IS NULL);

-- Função helper para registrar eventos da timeline (opcional, mas útil para triggers futuros)
CREATE OR REPLACE FUNCTION public.fn_record_timeline_event(
    p_client_id UUID,
    p_lead_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.client_timeline_events (client_id, lead_id, type, title, description, metadata, actor_id)
    VALUES (p_client_id, p_lead_id, p_type, p_title, p_description, p_metadata, auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
