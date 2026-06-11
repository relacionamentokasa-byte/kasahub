-- Ensure contracts table exists and is linked correctly
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    total_value DECIMAL(12,2) NOT NULL,
    monthly_value DECIMAL(12,2),
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'finished', 'cancelled')),
    billing_day INTEGER DEFAULT 5,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add contract_id to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Permissions for contracts
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'Users can manage contracts'
    ) THEN
        CREATE POLICY "Users can manage contracts" ON public.contracts FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

-- Improved function to handle proposal approval: Create Contract AND Initial Transactions
CREATE OR REPLACE FUNCTION public.handle_proposal_acceptance() 
RETURNS TRIGGER AS $$
DECLARE
    v_contract_id UUID;
    v_recurring_months INTEGER;
    v_i INTEGER;
    v_due_date DATE;
BEGIN
    -- Only act when status changes to 'accepted'
    IF (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted')) THEN
        -- 1. Create the Contract
        INSERT INTO public.contracts (
            client_id,
            proposal_id,
            title,
            total_value,
            monthly_value,
            start_date,
            payment_method,
            status
        ) VALUES (
            NEW.client_id,
            NEW.id,
            NEW.title,
            COALESCE(NEW.total, 0),
            COALESCE(NEW.monthly_investment, 0),
            COALESCE(NEW.first_due_date, CURRENT_DATE),
            NEW.payment_method,
            'active'
        ) RETURNING id INTO v_contract_id;

        -- 2. Determine recurrence
        v_recurring_months := COALESCE(NEW.recurring_months, 1);
        v_due_date := COALESCE(NEW.first_due_date, CURRENT_DATE);

        -- 3. Generate recurring transactions (Scheduled Revenue)
        FOR v_i IN 0..(v_recurring_months - 1) LOOP
            INSERT INTO public.transactions (
                description,
                amount,
                type,
                status,
                due_date,
                client_id,
                proposal_id,
                contract_id,
                payment_method
            ) VALUES (
                'Parcela ' || (v_i + 1) || '/' || v_recurring_months || ' - ' || NEW.title,
                CASE 
                    WHEN NEW.contract_type = 'recurring' THEN COALESCE(NEW.monthly_investment, 0)
                    ELSE COALESCE(NEW.total, 0) / v_recurring_months
                END,
                'income',
                'pending',
                (v_due_date + (v_i || ' month')::interval)::date,
                NEW.client_id,
                NEW.id,
                v_contract_id,
                NEW.payment_method
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
