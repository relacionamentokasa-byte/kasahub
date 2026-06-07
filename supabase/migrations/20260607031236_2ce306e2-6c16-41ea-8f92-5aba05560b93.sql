ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS accepted_user_agent TEXT,
ADD COLUMN IF NOT EXISTS internal_approval BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS internal_approval_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS internal_approval_at TIMESTAMP WITH TIME ZONE;

-- Grant permissions to authenticated and service_role
GRANT SELECT, UPDATE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;