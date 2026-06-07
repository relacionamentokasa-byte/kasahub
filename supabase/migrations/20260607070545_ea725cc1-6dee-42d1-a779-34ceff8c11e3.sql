-- Add auditing and origin tracking to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS origin_type TEXT; -- 'contract', 'manual', 'dme', 'commission', 'adjustment'

-- Add contract recurrence details
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS installments_count INTEGER DEFAULT 0; -- 0 means indefinite/continuous
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS next_billing_date DATE;

-- Update existing transactions to have a default origin if null
UPDATE public.transactions SET origin_type = 'contract' WHERE contract_id IS NOT NULL AND origin_type IS NULL;
UPDATE public.transactions SET origin_type = 'manual' WHERE contract_id IS NULL AND dme_id IS NULL AND origin_type IS NULL;
UPDATE public.transactions SET origin_type = 'dme' WHERE dme_id IS NOT NULL AND origin_type IS NULL;

-- Ensure service_role has access to new columns (if needed, though usually automatic for public schema)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

-- Create function to generate transactions from contract
CREATE OR REPLACE FUNCTION public.generate_contract_transactions()
RETURNS TRIGGER AS $$
DECLARE
    v_due_date DATE;
    v_installment_number INTEGER;
    v_total_installments INTEGER;
BEGIN
    -- If it's a new contract or some key values changed, we might need to seed initial transactions
    -- For now, let's create the first 12 months or the total installments if specified
    
    v_total_installments := COALESCE(NEW.installments_count, 12);
    IF v_total_installments = 0 THEN v_total_installments := 12; END IF;
    
    FOR i IN 0..(v_total_installments - 1) LOOP
        v_due_date := (NEW.start_date + (i || ' month')::interval);
        -- Adjust to billing day
        v_due_date := make_date(extract(year from v_due_date)::int, extract(month from v_due_date)::int, NEW.billing_day);
        
        -- Don't create if due_date is before start_date
        IF v_due_date < NEW.start_date THEN
            v_due_date := v_due_date + interval '1 month';
        END IF;

        INSERT INTO public.transactions (
            kind,
            description,
            amount,
            due_date,
            status,
            client_id,
            contract_id,
            origin_type,
            installment_number,
            installment_total,
            owner_id,
            created_by
        ) VALUES (
            'income',
            NEW.title || ' (' || (i + 1) || '/' || v_total_installments || ')',
            NEW.monthly_value,
            v_due_date,
            'pending',
            NEW.client_id,
            NEW.id,
            'contract',
            i + 1,
            v_total_installments,
            NEW.owner_id,
            auth.uid()
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate on contract creation
DROP TRIGGER IF EXISTS tr_generate_contract_transactions ON public.contracts;
CREATE TRIGGER tr_generate_contract_transactions
AFTER INSERT ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.generate_contract_transactions();
