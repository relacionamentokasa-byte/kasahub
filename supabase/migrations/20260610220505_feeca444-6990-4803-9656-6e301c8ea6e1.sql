-- Tentar adicionar cada tabela individualmente à publicação realtime
DO $$ 
BEGIN 
    -- Jobs
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'jobs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
    END IF;

    -- Comentários (Ambos nomes possíveis por segurança)
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'job_comentarios') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE job_comentarios;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_comments') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'job_comments') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE job_comments;
        END IF;
    END IF;

    -- Checklist
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'job_checklist') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE job_checklist;
    END IF;

    -- Financeiro (Tabela correta é transactions)
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    END IF;

    -- Clientes
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'clients') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE clients;
    END IF;

    -- Projetos
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'projects') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE projects;
    END IF;

    -- Notificações
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notificacoes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
    END IF;
END $$;