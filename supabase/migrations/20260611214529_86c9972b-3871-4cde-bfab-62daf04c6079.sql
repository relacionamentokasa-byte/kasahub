-- Migration to change scope column from text[] to text in proposals table
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'scope') THEN
        ALTER TABLE public.proposals 
        ALTER COLUMN scope TYPE text 
        USING array_to_string(scope, '</p><p>', '<p>') || CASE WHEN array_length(scope, 1) > 0 THEN '</p>' ELSE '' END;
    END IF;
END $$;

-- Migration to change scope column from text[] to text in contracts table if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'scope') THEN
        ALTER TABLE public.contracts 
        ALTER COLUMN scope TYPE text 
        USING array_to_string(scope, '</p><p>', '<p>') || CASE WHEN array_length(scope, 1) > 0 THEN '</p>' ELSE '' END;
    END IF;
END $$;

-- Re-grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
