-- 1) Flag de ativação por cliente
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS has_launch_grid BOOLEAN NOT NULL DEFAULT false;

-- 2) 1 grid por cliente
-- (remove duplicatas existentes mantendo o mais antigo)
WITH ranked AS (
  SELECT id, client_id,
         row_number() OVER (PARTITION BY client_id ORDER BY created_at ASC) AS rn
  FROM public.launch_grids
)
DELETE FROM public.launch_grids
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS launch_grids_client_id_unique
  ON public.launch_grids(client_id);

-- 3) Remove seed automático de statuses (usuário define as etapas)
DROP TRIGGER IF EXISTS trg_seed_default_launch_grid_statuses ON public.launch_grids;
DROP FUNCTION IF EXISTS public.seed_default_launch_grid_statuses();

-- 4) Marca como ativado os clientes que já possuem grid criado
UPDATE public.clients c
   SET has_launch_grid = true
  WHERE EXISTS (SELECT 1 FROM public.launch_grids g WHERE g.client_id = c.id);