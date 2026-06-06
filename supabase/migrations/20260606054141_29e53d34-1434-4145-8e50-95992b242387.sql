-- Tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'info', -- info, alert, critical
    category TEXT, -- mention, job, approval, finance, agenda, etc
    link TEXT, -- link para o registro relacionado
    origin_type TEXT, -- jobs, projects, etc
    origin_id UUID,
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Preferências de notificação
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    mentions BOOLEAN DEFAULT true,
    comments BOOLEAN DEFAULT true,
    jobs BOOLEAN DEFAULT true,
    approvals BOOLEAN DEFAULT true,
    agenda BOOLEAN DEFAULT true,
    finance BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,
    whatsapp_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

CREATE POLICY "Usuários podem ver suas próprias notificações" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem gerenciar suas próprias notificações" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem gerenciar suas preferências" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger para criar preferências ao criar perfil (se houver trigger de perfil) ou garantir que existam
CREATE OR REPLACE FUNCTION public.ensure_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assumindo que a tabela de perfis existe
CREATE TRIGGER trigger_ensure_notif_prefs AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_notification_preferences();

-- Função helper para disparar notificações
CREATE OR REPLACE FUNCTION public.notify_user(
    p_user_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_type TEXT DEFAULT 'info',
    p_category TEXT DEFAULT 'general',
    p_link TEXT DEFAULT NULL,
    p_origin_type TEXT DEFAULT NULL,
    p_origin_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notif_id UUID;
    v_enabled BOOLEAN;
BEGIN
    -- Verificar preferência
    SELECT CASE 
        WHEN p_category = 'mention' THEN mentions
        WHEN p_category = 'comment' THEN comments
        WHEN p_category = 'job' THEN jobs
        WHEN p_category = 'approval' THEN approvals
        WHEN p_category = 'agenda' THEN agenda
        WHEN p_category = 'finance' THEN finance
        ELSE true
    END INTO v_enabled
    FROM public.notification_preferences
    WHERE user_id = p_user_id;

    IF v_enabled IS FALSE THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.notifications (user_id, title, description, type, category, link, origin_type, origin_id)
    VALUES (p_user_id, p_title, p_description, p_type, p_category, p_link, p_origin_type, p_origin_id)
    RETURNING id INTO v_notif_id;

    RETURN v_notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
