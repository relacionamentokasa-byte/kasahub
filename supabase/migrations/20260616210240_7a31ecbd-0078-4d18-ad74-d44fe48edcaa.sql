
-- 1. Add new columns to approval_items
ALTER TABLE public.approval_items
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'single' CHECK (format IN ('single','carousel','story')),
  ADD COLUMN IF NOT EXISTS slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS slide_statuses jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. New table: per-slide comments
CREATE TABLE IF NOT EXISTS public.approval_item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_item_id uuid NOT NULL REFERENCES public.approval_items(id) ON DELETE CASCADE,
  slide_id text NULL,
  author_type text NOT NULL CHECK (author_type IN ('client','team')),
  author_name text NULL,
  author_id uuid NULL,
  body text NOT NULL,
  is_change_request boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aic_item ON public.approval_item_comments(approval_item_id);
CREATE INDEX IF NOT EXISTS idx_aic_slide ON public.approval_item_comments(approval_item_id, slide_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_item_comments TO authenticated;
GRANT ALL ON public.approval_item_comments TO service_role;

ALTER TABLE public.approval_item_comments ENABLE ROW LEVEL SECURITY;

-- Team members can read/manage all comments
CREATE POLICY "Team can view all comments"
  ON public.approval_item_comments FOR SELECT
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team can insert comments"
  ON public.approval_item_comments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team can update comments"
  ON public.approval_item_comments FOR UPDATE
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team can delete comments"
  ON public.approval_item_comments FOR DELETE
  TO authenticated
  USING (public.is_team_member(auth.uid()));
