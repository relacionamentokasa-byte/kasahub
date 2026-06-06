-- Adiciona coluna agency_logo_url à tabela public.profiles se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'agency_logo_url') THEN
        ALTER TABLE public.profiles ADD COLUMN agency_logo_url TEXT;
    END IF;
END $$;

-- Garante que o service_role e usuários autenticados possam acessar a coluna (já coberto pelo SELECT * nos perfis geralmente, mas por segurança)
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;