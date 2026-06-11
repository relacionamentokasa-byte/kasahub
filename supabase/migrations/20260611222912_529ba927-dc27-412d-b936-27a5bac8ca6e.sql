-- Atualizar restrição na tabela calendar_events
ALTER TABLE public.calendar_events
DROP CONSTRAINT calendar_events_project_id_fkey,
ADD CONSTRAINT calendar_events_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;

-- Atualizar restrição na tabela transactions
ALTER TABLE public.transactions
DROP CONSTRAINT transactions_project_id_fkey,
ADD CONSTRAINT transactions_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;
