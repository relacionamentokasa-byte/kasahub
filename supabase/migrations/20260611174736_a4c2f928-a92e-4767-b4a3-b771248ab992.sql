-- Transaction Categories Table
CREATE TABLE public.transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Transactions Table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue')),
    due_date DATE NOT NULL,
    payment_date DATE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_categories TO authenticated;
GRANT ALL ON public.transaction_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

-- RLS
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage transaction categories" ON public.transaction_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage transactions" ON public.transactions FOR ALL USING (auth.role() = 'authenticated');

-- Function to handle proposal acceptance and generate transactions
CREATE OR REPLACE FUNCTION public.handle_proposal_acceptance() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only act when status changes to 'accepted'
    IF (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted')) THEN
        -- Generate first transaction
        INSERT INTO public.transactions (
            description,
            amount,
            type,
            status,
            due_date,
            client_id,
            proposal_id,
            payment_method
        ) VALUES (
            'Entrada Proposta: ' || NEW.title,
            COALESCE(NEW.total, 0),
            'income',
            'pending',
            COALESCE(NEW.first_due_date, CURRENT_DATE),
            NEW.client_id,
            NEW.id,
            NEW.payment_method
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Proposal Acceptance
CREATE TRIGGER tr_proposal_accepted
    AFTER UPDATE ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_proposal_acceptance();

-- Seed some default categories
INSERT INTO public.transaction_categories (name, type, icon) VALUES 
('Serviços de Marketing', 'income', 'TrendingUp'),
('Consultoria', 'income', 'Briefcase'),
('Software/SaaS', 'expense', 'Cloud'),
('Infraestrutura', 'expense', 'Server'),
('Equipe/Freelancers', 'expense', 'Users'),
('Marketing/Ads', 'expense', 'Megaphone');
