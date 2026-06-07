-- Function to handle transaction cancellation on proposal or contract status change
CREATE OR REPLACE FUNCTION public.handle_finance_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to 'cancelled'
    IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status <> 'cancelled') THEN
        
        -- If it's a proposal
        IF TG_TABLE_NAME = 'proposals' THEN
            -- Cancel pending transactions linked to this proposal
            UPDATE public.transactions 
            SET status = 'cancelled'
            WHERE proposal_id = NEW.id 
              AND status = 'pending';

            -- Also cancel the contract if one was generated
            UPDATE public.contracts
            SET status = 'cancelled'
            WHERE proposal_id = NEW.id
              AND (status IS NULL OR status <> 'cancelled');
        
        -- If it's a contract
        ELSIF TG_TABLE_NAME = 'contracts' THEN
            -- Cancel pending transactions linked to this contract
            UPDATE public.transactions 
            SET status = 'cancelled'
            WHERE contract_id = NEW.id 
              AND status = 'pending';
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS on_proposal_cancelled ON public.proposals;
DROP TRIGGER IF EXISTS on_contract_cancelled ON public.contracts;

-- Create triggers
CREATE TRIGGER on_proposal_cancelled
    AFTER UPDATE ON public.proposals
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status <> 'cancelled')
    EXECUTE FUNCTION public.handle_finance_cancellation();

CREATE TRIGGER on_contract_cancelled
    AFTER UPDATE ON public.contracts
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status <> 'cancelled')
    EXECUTE FUNCTION public.handle_finance_cancellation();
