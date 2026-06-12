ALTER TABLE public.projects
  ADD CONSTRAINT projects_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';