DROP POLICY IF EXISTS "Portal users can view their client launch grids" ON public.launch_grids;
CREATE POLICY "Portal users can view their client launch grids"
ON public.launch_grids FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = launch_grids.client_id AND c.portal_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM client_portal_users cpu WHERE cpu.client_id = launch_grids.client_id AND cpu.auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Portal users can view their grid products" ON public.launch_grid_products;
CREATE POLICY "Portal users can view their grid products"
ON public.launch_grid_products FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM launch_grids g JOIN clients c ON c.id = g.client_id
    WHERE g.id = launch_grid_products.grid_id AND c.portal_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM launch_grids g JOIN client_portal_users cpu ON cpu.client_id = g.client_id
    WHERE g.id = launch_grid_products.grid_id AND cpu.auth_user_id = auth.uid()
  )
);