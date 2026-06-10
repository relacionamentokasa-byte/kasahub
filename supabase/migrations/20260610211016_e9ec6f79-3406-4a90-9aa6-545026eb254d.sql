-- 1. Garantir que a tabela existe com a estrutura correta
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Corrigir Políticas RLS (Limpar e Recriar para garantir consistência)
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Seleção: Apenas o dono
CREATE POLICY "Users can read their own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Inserção: Permitir que qualquer autenticado insira (necessário para um usuário notificar outro via front ou rpc)
CREATE POLICY "Anyone authenticated can insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- Atualização: Apenas o dono (para marcar como lido/arquivar)
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Deleção: Apenas o dono
CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 3. Função RPC para envio centralizado
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'info',
  p_category TEXT DEFAULT 'general',
  p_link TEXT DEFAULT NULL,
  p_origin_type TEXT DEFAULT NULL,
  p_origin_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, title, description, type, category, link, origin_type, origin_id, metadata
  ) VALUES (
    p_user_id, p_title, p_description, p_type, p_category, p_link, p_origin_type, p_origin_id, p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.notify_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_user TO service_role;
