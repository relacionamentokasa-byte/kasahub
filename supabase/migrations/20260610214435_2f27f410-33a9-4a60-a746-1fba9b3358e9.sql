CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON public.notificacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lido ON public.notificacoes(user_id, lido);