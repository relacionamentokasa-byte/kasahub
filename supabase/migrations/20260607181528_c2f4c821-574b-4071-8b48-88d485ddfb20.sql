-- 1. Inserir novas categorias se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Fee Mensal') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Fee Mensal', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Tráfego Pago') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Tráfego Pago', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Social Media') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Social Media', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Conteúdo') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Conteúdo', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Consultoria') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Consultoria', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Job Avulso') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Job Avulso', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Projeto Especial') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Projeto Especial', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Comissão') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Comissão', 'income');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Despesa') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Despesa', 'expense');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Imposto / Taxa') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Imposto / Taxa', 'expense');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = 'Não Classificado') THEN
        INSERT INTO public.financial_categories (name, kind) VALUES ('Não Classificado', 'income');
    END IF;
END $$;

-- 2. Atualizar lançamentos que usam categorias antigas para novas categorias equivalentes
UPDATE public.transactions 
SET category_id = (SELECT id FROM public.financial_categories WHERE name = 'Fee Mensal' LIMIT 1)
WHERE category_id IN (SELECT id FROM public.financial_categories WHERE name IN ('Recorrente', 'Serviços Recorrentes'));

UPDATE public.transactions 
SET category_id = (SELECT id FROM public.financial_categories WHERE name = 'Job Avulso' LIMIT 1)
WHERE category_id IN (SELECT id FROM public.financial_categories WHERE name IN ('Avulso', 'Jobs Avulsos'));

-- 3. Remover categorias antigas que não estão na nova lista
DELETE FROM public.financial_categories 
WHERE name IN ('Avulso', 'Jobs Avulsos', 'Recorrente', 'Serviços Recorrentes');
