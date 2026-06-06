-- Create recurrences table
CREATE TABLE public.recurrences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'terminated')),
    description TEXT,
    amount NUMERIC,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add recurrence_id to transactions
ALTER TABLE public.transactions ADD COLUMN recurrence_id UUID REFERENCES public.recurrences(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurrences TO authenticated;
GRANT ALL ON public.recurrences TO service_role;

-- Policies
CREATE POLICY "Users can manage their own recurrences" ON public.recurrences
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Update trigger for updated_at
CREATE TRIGGER update_recurrences_updated_at 
    BEFORE UPDATE ON public.recurrences 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Optional: Create an audit table for recurrence changes (as requested: "Registrar: Usuário responsável, Data e hora, Quantidade de parcelas removidas...")
CREATE TABLE public.recurrence_audit (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    recurrence_id UUID REFERENCES public.recurrences(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recurrence_audit ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.recurrence_audit TO authenticated;
GRANT ALL ON public.recurrence_audit TO service_role;

CREATE POLICY "Users can view their own recurrence audits" ON public.recurrence_audit
    FOR SELECT USING (auth.uid() = user_id);
