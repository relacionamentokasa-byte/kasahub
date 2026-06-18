
-- FKs to enable PostgREST embedded resources (single round-trip for DME list)
ALTER TABLE public.extra_demands
  ADD CONSTRAINT extra_demands_responsible_profile_fkey
  FOREIGN KEY (responsible_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.extra_demands
  ADD CONSTRAINT extra_demands_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_extra_demands_client_id ON public.extra_demands (client_id);
CREATE INDEX IF NOT EXISTS idx_extra_demands_contract_id ON public.extra_demands (contract_id);
CREATE INDEX IF NOT EXISTS idx_extra_demands_status ON public.extra_demands (status);
CREATE INDEX IF NOT EXISTS idx_extra_demands_created_at ON public.extra_demands (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_dme_id ON public.jobs (dme_id);
