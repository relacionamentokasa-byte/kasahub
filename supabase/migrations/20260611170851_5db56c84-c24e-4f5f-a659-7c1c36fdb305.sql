-- Remover tabelas se existirem
DROP TABLE IF EXISTS public.financial_invoice_items CASCADE;
DROP TABLE IF EXISTS public.financial_invoices CASCADE;
DROP TABLE IF EXISTS public.financial_expenses CASCADE;
DROP TABLE IF EXISTS public.financial_extra_demands CASCADE;
DROP TABLE IF EXISTS public.financial_import_logs CASCADE;

-- Também remover tabelas legadas mencionadas no AppSidebar e componentes
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.bank_accounts CASCADE;
DROP TABLE IF EXISTS public.contracts CASCADE;
DROP TABLE IF EXISTS public.financial_categories CASCADE;

-- Limpar possíveis triggers ou funções específicas se necessário
-- (Geralmente o CASCADE acima cuida disso)
