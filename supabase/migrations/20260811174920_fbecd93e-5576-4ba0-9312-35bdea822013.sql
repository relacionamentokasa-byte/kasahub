-- MIGRATION: Adicionar editorial_post_id à tabela de jobs
-- DESC: Permite vincular um job a um post do calendário editorial.

-- 1. Criar a coluna
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS editorial_post_id uuid REFERENCES public.editorial_posts(id) ON DELETE SET NULL;

-- 2. Garantir permissões (TanStack Start stack requer grants explícitos)
-- Note: A tabela jobs já possui grants, mas é boa prática reafirmar após alteração
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

-- 3. Notificar o PostgREST para recarregar o cache do schema
NOTIFY pgrst, 'reload schema';
