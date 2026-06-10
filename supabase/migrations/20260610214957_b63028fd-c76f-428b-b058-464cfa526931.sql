-- Adicionar colunas extras na tabela nova para manter compatibilidade com as funcionalidades existentes
ALTER TABLE public.job_comentarios 
ADD COLUMN IF NOT EXISTS mentions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS type text DEFAULT 'comment',
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamptz,
ADD COLUMN IF NOT EXISTS previous_versions jsonb DEFAULT '[]'::jsonb;

-- Migrar dados da tabela antiga para a nova se houver dados
INSERT INTO public.job_comentarios (id, job_id, user_id, mensagem, mentions, created_at, type, metadata, is_system, updated_at, previous_versions)
SELECT id, job_id, user_id, content, mentions, created_at, type, metadata, is_system, updated_at, previous_versions
FROM public.job_comments
ON CONFLICT (id) DO NOTHING;

-- Garantir que a tabela antiga seja desativada ou renomeada para evitar confusão no futuro
-- Por enquanto apenas garantimos que a nova é a principal
COMMENT ON TABLE public.job_comentarios IS 'Tabela principal de comunicações dos jobs reconstruída para simplicidade e funcionalidade.';
