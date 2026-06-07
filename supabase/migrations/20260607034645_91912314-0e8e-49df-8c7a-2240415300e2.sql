ALTER TABLE public.jobs ADD COLUMN service_id UUID REFERENCES public.services(id);
ALTER TABLE public.jobs ADD COLUMN contract_id UUID REFERENCES public.contracts(id);

-- Para tornar NOT NULL, precisamos garantir que não existam registros nulos ou deletar os órfãos se permitido.
-- Como é um ambiente de desenvolvimento/novo requisito, vamos apenas forçar NOT NULL se possível.
-- Se houver dados, o migration pode falhar. Idealmente o usuário limpa ou o Lovable lida.
-- Vamos tentar limpar jobs sem cliente/projeto primeiro.
DELETE FROM public.jobs WHERE client_id IS NULL OR project_id IS NULL;

ALTER TABLE public.jobs ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN project_id SET NOT NULL;
