-- 1. Script de Limpeza (Migração de Dados Antigos)
UPDATE public.proposals SET status = 'Enviada' WHERE status IN ('Pendente', 'sent', 'viewed');
UPDATE public.proposals SET status = 'Aprovada' WHERE status IN ('Convertida', 'accepted', 'signed', 'converted');
UPDATE public.proposals SET status = 'Recusada' WHERE status IN ('rejected', 'cancelled');
UPDATE public.proposals SET status = 'Rascunho' WHERE status IN ('draft', 'waiting_signature');

-- 2. Garantir que status vazios ou nulos sejam Rascunho
UPDATE public.proposals SET status = 'Rascunho' WHERE status IS NULL OR status = '';

-- 3. Adicionar restrição de status
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'proposals' AND constraint_name = 'proposals_status_check') THEN
        ALTER TABLE public.proposals DROP CONSTRAINT proposals_status_check;
    END IF;
END $$;

ALTER TABLE public.proposals ADD CONSTRAINT proposals_status_check CHECK (status IN ('Rascunho', 'Enviada', 'Aprovada', 'Recusada', 'Encerrada'));
