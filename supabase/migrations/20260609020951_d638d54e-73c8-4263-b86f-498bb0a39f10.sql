ALTER TABLE public.bank_accounts ADD COLUMN bank_logo_url TEXT;
COMMENT ON COLUMN public.bank_accounts.bank_logo_url IS 'URL da logo oficial do banco ou imagem carregada manualmente';