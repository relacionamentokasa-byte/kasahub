
-- =========================================================
-- LAUNCH GRIDS (Grid de Lançamento)
-- =========================================================

CREATE TABLE public.launch_grids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | archived
  launch_date DATE,
  owner_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_launch_grids_client ON public.launch_grids(client_id);
CREATE INDEX idx_launch_grids_status ON public.launch_grids(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_grids TO authenticated;
GRANT ALL ON public.launch_grids TO service_role;

ALTER TABLE public.launch_grids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage launch grids"
  ON public.launch_grids FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Portal users can view their client launch grids"
  ON public.launch_grids FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = launch_grids.client_id
        AND c.portal_user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_launch_grids_updated_at
  BEFORE UPDATE ON public.launch_grids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- LAUNCH GRID STATUSES (etapas customizáveis por grid)
-- =========================================================

CREATE TABLE public.launch_grid_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id UUID NOT NULL REFERENCES public.launch_grids(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#94a3b8',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_launch_grid_statuses_grid ON public.launch_grid_statuses(grid_id, order_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_grid_statuses TO authenticated;
GRANT ALL ON public.launch_grid_statuses TO service_role;

ALTER TABLE public.launch_grid_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage launch grid statuses"
  ON public.launch_grid_statuses FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Portal users can view their grid statuses"
  ON public.launch_grid_statuses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.launch_grids g
      JOIN public.clients c ON c.id = g.client_id
      WHERE g.id = launch_grid_statuses.grid_id
        AND c.portal_user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_launch_grid_statuses_updated_at
  BEFORE UPDATE ON public.launch_grid_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- LAUNCH GRID PRODUCTS (cards do grid)
-- =========================================================

CREATE TABLE public.launch_grid_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id UUID NOT NULL REFERENCES public.launch_grids(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  status_id UUID REFERENCES public.launch_grid_statuses(id) ON DELETE SET NULL,
  due_date DATE,
  responsible_id UUID,
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_launch_grid_products_grid ON public.launch_grid_products(grid_id, order_index);
CREATE INDEX idx_launch_grid_products_status ON public.launch_grid_products(status_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_grid_products TO authenticated;
GRANT ALL ON public.launch_grid_products TO service_role;

ALTER TABLE public.launch_grid_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage launch grid products"
  ON public.launch_grid_products FOR ALL
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Portal users can view their grid products"
  ON public.launch_grid_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.launch_grids g
      JOIN public.clients c ON c.id = g.client_id
      WHERE g.id = launch_grid_products.grid_id
        AND c.portal_user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_launch_grid_products_updated_at
  BEFORE UPDATE ON public.launch_grid_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Vincula jobs a produtos do grid
-- =========================================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS launch_product_id UUID
  REFERENCES public.launch_grid_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_launch_product ON public.jobs(launch_product_id);

-- Permite job existir vinculado APENAS a um launch_product (sem project/dme)
-- O trigger check_job_integrity exige project OU dme. Vamos atualizá-lo:
CREATE OR REPLACE FUNCTION public.check_job_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.project_id IS NULL
       AND NEW.dme_id IS NULL
       AND NEW.launch_product_id IS NULL THEN
        RAISE EXCEPTION 'Erro de Integridade: Um Job deve estar vinculado a um Projeto, DME ou Produto de Lançamento.';
    END IF;
    RETURN NEW;
END;
$function$;

-- =========================================================
-- Trigger: seed das etapas padrão ao criar um grid
-- =========================================================

CREATE OR REPLACE FUNCTION public.seed_default_launch_grid_statuses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.launch_grid_statuses (grid_id, label, color, order_index, is_done) VALUES
    (NEW.id, 'Briefing',     '#94a3b8', 0, false),
    (NEW.id, 'Em produção',  '#3b82f6', 1, false),
    (NEW.id, 'Em revisão',   '#f59e0b', 2, false),
    (NEW.id, 'Aprovado',     '#22c55e', 3, false),
    (NEW.id, 'Publicado',    '#16a34a', 4, true);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_seed_default_launch_grid_statuses
  AFTER INSERT ON public.launch_grids
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_launch_grid_statuses();
