-- The user reported "column custom_fields_schema of relation jobs does not exist"
-- However, I previously added it thinking it was missing.
-- Re-evaluating: custom_fields_schema seems to be intended for the CONFIGURATION (operational_flow_jobs)
-- whereas actual data goes into custom_form_data on the jobs table.

-- 1. Remove it from jobs if it's causing confusion/errors and not being used correctly there
ALTER TABLE public.jobs DROP COLUMN IF EXISTS custom_fields_schema;

-- 2. Ensure it exists on operational_flow_jobs (it already does, but let's be safe)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operational_flow_jobs' AND column_name = 'custom_fields_schema') THEN
        ALTER TABLE public.operational_flow_jobs ADD COLUMN custom_fields_schema JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. Create a system logs table for structural errors as requested
CREATE TABLE IF NOT EXISTS public.system_errors_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT,
    column_name TEXT,
    query_text TEXT,
    error_message TEXT,
    user_id UUID REFERENCES auth.users(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT INSERT, SELECT ON public.system_errors_log TO authenticated;
GRANT ALL ON public.system_errors_log TO service_role;
ALTER TABLE public.system_errors_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own error logs" ON public.system_errors_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert error logs" ON public.system_errors_log
    FOR INSERT WITH CHECK (true);
