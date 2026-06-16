
ALTER TABLE public.approval_items DROP CONSTRAINT IF EXISTS approval_items_status_check;
ALTER TABLE public.approval_items ADD CONSTRAINT approval_items_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'archived'::text]));
ALTER TABLE public.approval_items ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
