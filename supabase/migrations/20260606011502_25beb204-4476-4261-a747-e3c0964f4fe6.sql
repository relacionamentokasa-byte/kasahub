-- Add project type column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_type') THEN
        CREATE TYPE project_type AS ENUM ('automatic', 'special');
    END IF;
END $$;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'automatic';
-- We use TEXT for simplicity with the existing codebase patterns, but could use the enum if preferred.
-- The user specified: Automático, Especial.

-- Add responsible_id to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES public.profiles(id);

-- Add period to jobs for grouping
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS period TEXT; -- Format: 'YYYY-MM'

-- Update existing projects to be 'automatic' by default
UPDATE public.projects SET type = 'automatic' WHERE type IS NULL;

-- Ensure grants are correct
GRANT ALL ON public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

GRANT ALL ON public.jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;