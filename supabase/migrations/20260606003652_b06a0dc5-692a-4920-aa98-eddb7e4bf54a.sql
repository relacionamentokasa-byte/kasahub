-- 1. Create the sequence for DME numbering
CREATE SEQUENCE IF NOT EXISTS extra_demands_number_seq START 1;

-- 2. Create the extra_demands table
CREATE TABLE public.extra_demands (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    number_display TEXT NOT NULL UNIQUE DEFAULT ('DME-' || LPAD(nextval('extra_demands_number_seq')::text, 3, '0')),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deadline_days INTEGER, -- Number of business days
    responsible_id UUID REFERENCES auth.users(id),
    is_billable BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_production', 'completed', 'cancelled')),
    public_token UUID DEFAULT gen_random_uuid() UNIQUE,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    owner_id UUID REFERENCES auth.users(id)
);

-- 3. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extra_demands TO authenticated;
GRANT ALL ON public.extra_demands TO service_role;

-- 4. Enable RLS
ALTER TABLE public.extra_demands ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Users can manage extra_demands" ON public.extra_demands
    FOR ALL USING (true) WITH CHECK (true); -- Simplify for now as the app uses a shared owner model often

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_extra_demands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_extra_demands_updated_at
    BEFORE UPDATE ON public.extra_demands
    FOR EACH ROW
    EXECUTE FUNCTION public.update_extra_demands_updated_at();

-- 7. Add DME origin to transactions and jobs
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS dme_id UUID REFERENCES public.extra_demands(id) ON DELETE SET NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS dme_id UUID REFERENCES public.extra_demands(id) ON DELETE SET NULL;
