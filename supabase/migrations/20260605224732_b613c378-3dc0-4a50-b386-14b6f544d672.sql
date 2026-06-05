-- Fix scope column if missing or wrong type
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'scope') THEN
        ALTER TABLE public.proposals ADD COLUMN scope text[] DEFAULT '{}'::text[];
    END IF;
END $$;

-- Ensure generated_contract_id and generated_project_id exist (they seem to exist but let's be safe)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'generated_project_id') THEN
        ALTER TABLE public.proposals ADD COLUMN generated_project_id uuid REFERENCES public.projects(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'generated_contract_id') THEN
        ALTER TABLE public.proposals ADD COLUMN generated_contract_id uuid REFERENCES public.contracts(id);
    END IF;
END $$;

-- Add a column to track if it was converted
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS converted_at timestamp with time zone;

-- Grant permissions (standard requirement)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
