CREATE TABLE public.agency_goals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, -- 'revenue', 'contracts', 'jobs'
    period TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    target_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    month INTEGER, -- 1-12 if period is monthly
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_goals TO authenticated;
GRANT ALL ON public.agency_goals TO service_role;

ALTER TABLE public.agency_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all agency goals" ON public.agency_goals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage agency goals" ON public.agency_goals FOR ALL USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND (ur.role::text = 'admin' OR ur.role::text = 'ceo' OR ur.role::text = 'gestor')
)) WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND (ur.role::text = 'admin' OR ur.role::text = 'ceo' OR ur.role::text = 'gestor')
));

-- Insert some default goals for current month/year
DO $$
DECLARE
    curr_month INTEGER := EXTRACT(MONTH FROM now());
    curr_year INTEGER := EXTRACT(YEAR FROM now());
BEGIN
    INSERT INTO public.agency_goals (type, period, target_value, month, year)
    VALUES 
    ('revenue', 'monthly', 30000, curr_month, curr_year),
    ('contracts', 'monthly', 5, curr_month, curr_year),
    ('jobs', 'monthly', 120, curr_month, curr_year);
END $$;
