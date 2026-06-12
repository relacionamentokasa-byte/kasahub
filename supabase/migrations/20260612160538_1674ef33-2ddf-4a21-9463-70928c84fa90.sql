
CREATE TABLE public.categorias_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nome, tipo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_financeiras TO authenticated;
GRANT ALL ON public.categorias_financeiras TO service_role;

ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON public.categorias_financeiras FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON public.categorias_financeiras FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON public.categorias_financeiras FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON public.categorias_financeiras FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_categorias_financeiras_updated_at
  BEFORE UPDATE ON public.categorias_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categorias_financeiras (nome, tipo) VALUES
  ('Fee Mensal', 'Receita'),
  ('Job Avulso', 'Receita'),
  ('Freelancers e Terceirizados', 'Despesa'),
  ('Mídia / Tráfego Pago (Agência)', 'Despesa'),
  ('Ferramentas de Marketing e Software', 'Despesa'),
  ('Hospedagem e Domínios', 'Despesa'),
  ('Pró-labore', 'Despesa'),
  ('Salários e Encargos', 'Despesa'),
  ('Impostos', 'Despesa'),
  ('Contabilidade / Honorários', 'Despesa'),
  ('Assinaturas Administrativas', 'Despesa'),
  ('Tarifas Bancárias e Taxas de Cartão', 'Despesa'),
  ('Internet e Telefonia', 'Despesa'),
  ('Aluguel e Condomínio', 'Despesa'),
  ('Tráfego Pago (Kasa)', 'Despesa'),
  ('Brindes e Mimos para Clientes', 'Despesa'),
  ('Eventos, Cursos e Treinamentos', 'Despesa'),
  ('Equipamentos', 'Despesa'),
  ('Manutenção e Consertos', 'Despesa'),
  ('Outras Despesas', 'Despesa')
ON CONFLICT (nome, tipo) DO NOTHING;
