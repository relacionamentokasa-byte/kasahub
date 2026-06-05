
-- Bank accounts
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank text,
  account_type text NOT NULL DEFAULT 'checking',
  initial_balance numeric NOT NULL DEFAULT 0,
  color text DEFAULT '#FFBC45',
  is_active boolean NOT NULL DEFAULT true,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages bank accounts" ON public.bank_accounts FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE TRIGGER trg_bank_accounts_updated BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Financial categories
CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'expense', -- 'income' | 'expense'
  color text DEFAULT '#FFBC45',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages categories" ON public.financial_categories FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE TRIGGER trg_financial_categories_updated BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contracts (recurring revenue per client)
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  proposal_id uuid,
  title text NOT NULL,
  monthly_value numeric NOT NULL DEFAULT 0,
  billing_day int NOT NULL DEFAULT 5,
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  status text NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'cancelled'
  notes text,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages contracts" ON public.contracts FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL, -- 'income' | 'expense'
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL DEFAULT current_date,
  paid_at date,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'overdue' | 'cancelled'
  account_id uuid,
  category_id uuid,
  client_id uuid,
  project_id uuid,
  proposal_id uuid,
  contract_id uuid,
  is_recurring boolean NOT NULL DEFAULT false,
  installment_total int,
  installment_number int,
  notes text,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages transactions" ON public.transactions FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_transactions_due ON public.transactions(due_date);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_client ON public.transactions(client_id);

-- Seed default categories
INSERT INTO public.financial_categories (name, kind, color) VALUES
  ('Serviços recorrentes', 'income', '#FFBC45'),
  ('Jobs avulsos', 'income', '#22C55E'),
  ('Tráfego pago (repasse)', 'income', '#3B82F6'),
  ('Folha de pagamento', 'expense', '#EF4444'),
  ('Freelancers', 'expense', '#F59E0B'),
  ('Ferramentas / SaaS', 'expense', '#8B5CF6'),
  ('Infraestrutura', 'expense', '#06B6D4'),
  ('Marketing', 'expense', '#EC4899'),
  ('Impostos', 'expense', '#64748B'),
  ('Outras despesas', 'expense', '#94A3B8');

-- Helper view-like function: account balance
CREATE OR REPLACE FUNCTION public.account_balance(_account_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT initial_balance FROM public.bank_accounts WHERE id = _account_id), 0)
    + COALESCE((SELECT sum(CASE WHEN kind='income' THEN amount ELSE -amount END)
                FROM public.transactions
                WHERE account_id = _account_id AND status = 'paid'), 0);
$$;
