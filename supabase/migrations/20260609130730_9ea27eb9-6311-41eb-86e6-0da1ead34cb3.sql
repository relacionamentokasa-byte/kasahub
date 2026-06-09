-- 1. Remove as categorias de despesa antigas
DELETE FROM public.financial_categories WHERE kind = 'expense';

-- 2. Insere as novas categorias de despesa
INSERT INTO public.financial_categories (name, kind) VALUES 
('Despesa Operacional', 'expense'),
('Despesa com Pessoal', 'expense'),
('Ferramentas & Software', 'expense'),
('Aluguel & Infraestrutura', 'expense'),
('Imposto / Taxa', 'expense'),
('Comissão a Pagar', 'expense'),
('Fornecedor', 'expense'),
('Marketing & Mídia', 'expense'),
('Outros', 'expense');

-- 3. Garante que as categorias de receita estejam corretas (remove duplicatas ou limpa para reinserir se necessário, 
-- mas o pedido diz "manter as já existentes" - porém, para garantir que as categorias EXATAS solicitadas existam,
-- vamos garantir que elas estejam lá).
-- Primeiro, vamos ver o que já existe para não apagar dados de usuários se possível.
-- No entanto, como o sistema parece estar em setup, vamos garantir a lista exata.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Fee Mensal' AND kind = 'income') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Fee Mensal', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Tráfego Pago' AND kind = 'income') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Tráfego Pago', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Social Media' AND kind = 'income') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Social Media', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Conteúdo' AND kind = 'income') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Conteúdo', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Consultoria' AND kind = 'income') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Consultoria', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Job Avulso' AND kind = 'income') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Job Avulso', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Projeto Especial' AND kind = 'income') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Projeto Especial', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Comissão' AND kind = 'income') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Comissão', 'income');
    END IF;
END $$;
