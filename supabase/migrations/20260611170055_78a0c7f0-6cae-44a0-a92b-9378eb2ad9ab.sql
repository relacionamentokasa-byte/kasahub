-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Table financial_invoices
CREATE TABLE public.financial_invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_invoices TO authenticated;
GRANT ALL ON public.financial_invoices TO service_role;
ALTER TABLE public.financial_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all invoices" ON public.financial_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage invoices" ON public.financial_invoices FOR ALL TO authenticated 
USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' )
WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

CREATE TRIGGER update_financial_invoices_updated_at BEFORE UPDATE ON public.financial_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Table financial_invoice_items
CREATE TABLE public.financial_invoice_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.financial_invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_invoice_items TO authenticated;
GRANT ALL ON public.financial_invoice_items TO service_role;
ALTER TABLE public.financial_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all invoice items" ON public.financial_invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage invoice items" ON public.financial_invoice_items FOR ALL TO authenticated 
USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' )
WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

CREATE TRIGGER update_financial_invoice_items_updated_at BEFORE UPDATE ON public.financial_invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Table financial_expenses
CREATE TABLE public.financial_expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('operational', 'software', 'marketing', 'freelance', 'other')),
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    receipt_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_expenses TO authenticated;
GRANT ALL ON public.financial_expenses TO service_role;
ALTER TABLE public.financial_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all expenses" ON public.financial_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage expenses" ON public.financial_expenses FOR ALL TO authenticated 
USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' )
WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

CREATE TRIGGER update_financial_expenses_updated_at BEFORE UPDATE ON public.financial_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Table financial_extra_demands
CREATE TABLE public.financial_extra_demands (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    estimated_hours NUMERIC(12,2),
    hourly_rate NUMERIC(12,2),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'invoiced', 'cancelled')),
    invoice_id UUID REFERENCES public.financial_invoices(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_extra_demands TO authenticated;
GRANT ALL ON public.financial_extra_demands TO service_role;
ALTER TABLE public.financial_extra_demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all extra demands" ON public.financial_extra_demands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage extra demands" ON public.financial_extra_demands FOR ALL TO authenticated 
USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' )
WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

CREATE TRIGGER update_financial_extra_demands_updated_at BEFORE UPDATE ON public.financial_extra_demands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Table financial_imports
CREATE TABLE public.financial_imports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    filename TEXT NOT NULL,
    import_type TEXT NOT NULL CHECK (import_type IN ('clients', 'invoices', 'expenses')),
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    error_log TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_imports TO authenticated;
GRANT ALL ON public.financial_imports TO service_role;
ALTER TABLE public.financial_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all imports" ON public.financial_imports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage imports" ON public.financial_imports FOR ALL TO authenticated 
USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' )
WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );
