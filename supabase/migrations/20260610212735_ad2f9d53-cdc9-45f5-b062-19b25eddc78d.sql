-- 1. Renomear "Em Execução" para "Em Andamento"
UPDATE public.job_stages 
SET name = '⚙️ Em Andamento' 
WHERE name = '⚙️ Em Execução';

-- 2. Abrir espaço para a nova coluna "Em Revisão" (order_index 2)
UPDATE public.job_stages 
SET order_index = order_index + 1 
WHERE order_index >= 2;

-- 3. Inserir a nova coluna "Em Revisão"
INSERT INTO public.job_stages (id, name, order_index, color, is_done)
VALUES (gen_random_uuid(), '🔍 Em Revisão', 2, '#ffbc45', false);

-- 4. Garantir que as permissões estejam corretas para a nova coluna (embora já devam estar via default privileges se configurado, mas por segurança para migrations em projetos Lovable)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_stages TO authenticated;
GRANT ALL ON public.job_stages TO service_role;
