ALTER TABLE public.extra_demands DROP CONSTRAINT IF EXISTS extra_demands_status_check;
ALTER TABLE public.extra_demands ADD CONSTRAINT extra_demands_status_check
  CHECK (status = ANY (ARRAY['draft','sent','pending','pending_approval','approved','rejected','in_production','completed','cancelled']));