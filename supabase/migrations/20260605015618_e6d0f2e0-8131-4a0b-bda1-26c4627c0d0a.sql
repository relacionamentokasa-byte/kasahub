-- 1. Extra portal config on clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_cover_url text,
  ADD COLUMN IF NOT EXISTS brand_secondary text;

-- 2. Portal users for each client
CREATE TABLE IF NOT EXISTS public.client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  role text,
  phone text,
  permissions jsonb NOT NULL DEFAULT '{"approvals":true,"projects":true,"jobs":true,"calendar":true,"files":true,"reports":true}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_users TO authenticated;
GRANT ALL ON public.client_portal_users TO service_role;

ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;

-- Team manages all portal users
CREATE POLICY "Team manages portal users"
  ON public.client_portal_users
  FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- A portal user can read their own row
CREATE POLICY "Portal user reads own"
  ON public.client_portal_users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE TRIGGER set_updated_at_client_portal_users
  BEFORE UPDATE ON public.client_portal_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_client_portal_users_client ON public.client_portal_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_auth ON public.client_portal_users(auth_user_id);