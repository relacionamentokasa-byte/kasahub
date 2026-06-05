-- Add contract/address fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'recurring',
  ADD COLUMN IF NOT EXISTS contract_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS address text;

-- client_services: services contracted by a client
CREATE TABLE IF NOT EXISTS public.client_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  contract_type text NOT NULL DEFAULT 'recurring',
  monthly_value numeric NOT NULL DEFAULT 0,
  one_time_value numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  billing_day integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, service_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_services TO authenticated;
GRANT ALL ON public.client_services TO service_role;

ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team manages client services"
  ON public.client_services
  FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Clients can read their services"
  ON public.client_services
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_services.client_id
      AND c.portal_user_id = auth.uid()
  ));

CREATE TRIGGER update_client_services_updated_at
  BEFORE UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_client_services_client ON public.client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_service ON public.client_services(service_id);
