ALTER TABLE public.launch_grid_products DROP CONSTRAINT IF EXISTS launch_grid_products_status_id_fkey;
UPDATE public.launch_grid_products SET status_id = NULL WHERE status_id IS NOT NULL;
ALTER TABLE public.launch_grid_products ADD CONSTRAINT launch_grid_products_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.job_stages(id) ON DELETE SET NULL;