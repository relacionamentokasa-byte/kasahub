CREATE TABLE public.agency_indicator_targets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    indicator_id UUID NOT NULL REFERENCES public.agency_indicators(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER, -- NULL para metas anuais, 1-12 para mensais
    target_value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(indicator_id, year, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_indicator_targets TO authenticated;
GRANT ALL ON public.agency_indicator_targets TO service_role;

ALTER TABLE public.agency_indicator_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage targets for their indicators" ON public.agency_indicator_targets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.agency_indicators
            WHERE id = indicator_id AND (owner_id = auth.uid() OR owner_id IS NULL)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agency_indicators
            WHERE id = indicator_id AND (owner_id = auth.uid() OR owner_id IS NULL)
        )
    );

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agency_indicator_targets_updated_at 
    BEFORE UPDATE ON public.agency_indicator_targets 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();