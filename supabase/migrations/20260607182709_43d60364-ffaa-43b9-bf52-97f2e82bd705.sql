-- Update transactions to clear old category references
UPDATE public.transactions SET category_id = NULL;

-- Delete all existing categories
DELETE FROM public.financial_categories;

-- Insert the 10 requested categories in order
-- Using a standard color for income-like and expense-like if kind exists, 
-- or just a consistent set of colors.
-- I'll check the 'kind' column in financial_categories.
INSERT INTO public.financial_categories (id, name, kind, color) VALUES
(gen_random_uuid(), 'Fee Mensal', 'income', '#FFBC45'),
(gen_random_uuid(), 'Tráfego Pago', 'income', '#3B82F6'),
(gen_random_uuid(), 'Social Media', 'income', '#EC4899'),
(gen_random_uuid(), 'Conteúdo', 'income', '#F59E0B'),
(gen_random_uuid(), 'Consultoria', 'income', '#8B5CF6'),
(gen_random_uuid(), 'Job Avulso', 'income', '#22C55E'),
(gen_random_uuid(), 'Projeto Especial', 'income', '#A855F7'),
(gen_random_uuid(), 'Comissão', 'income', '#10B981'),
(gen_random_uuid(), 'Despesa', 'expense', '#EF4444'),
(gen_random_uuid(), 'Imposto / Taxa', 'expense', '#64748B');
