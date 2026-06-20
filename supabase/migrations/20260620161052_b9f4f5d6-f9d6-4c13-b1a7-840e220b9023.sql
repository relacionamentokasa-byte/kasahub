-- 1) report_templates
CREATE TABLE public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_templates TO authenticated;
GRANT ALL ON public.report_templates TO service_role;

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read templates"
  ON public.report_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage templates - insert"
  ON public.report_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage templates - update"
  ON public.report_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage templates - delete"
  ON public.report_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER report_templates_set_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.report_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','finalizado')),
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_client_id ON public.reports(client_id);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team members manage reports - select"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team members manage reports - insert"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team members manage reports - update"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team members manage reports - delete"
  ON public.reports FOR DELETE TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE TRIGGER reports_set_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Templates iniciais
INSERT INTO public.report_templates (name, description, is_default, slides) VALUES
('Relatório Mensal de Performance',
 'Estrutura padrão para apresentar resultados mensais ao cliente.',
 true,
 '[
   {"id":"s1","type":"cover","props":{"kicker":"RELATÓRIO MENSAL","title":"Resultados do mês","subtitle":"Visão consolidada das entregas e indicadores","period":"Mês/Ano"}},
   {"id":"s2","type":"section","props":{"kicker":"01","title":"Resumo executivo"}},
   {"id":"s3","type":"text","props":{"title":"Visão geral","body":"Escreva aqui o resumo do mês: principais entregas, conquistas e contexto."}},
   {"id":"s4","type":"kpis","props":{"title":"Indicadores do mês","items":[{"label":"Indicador A","value":"0","delta":""},{"label":"Indicador B","value":"0","delta":""},{"label":"Indicador C","value":"0","delta":""}]}},
   {"id":"s5","type":"section","props":{"kicker":"02","title":"Entregas"}},
   {"id":"s6","type":"deliverables","props":{"title":"O que foi entregue","items":[{"label":"Entrega 1","done":true},{"label":"Entrega 2","done":true},{"label":"Entrega 3","done":false}]}},
   {"id":"s7","type":"gallery","props":{"title":"Materiais produzidos","images":[]}},
   {"id":"s8","type":"section","props":{"kicker":"03","title":"Comparativo"}},
   {"id":"s9","type":"comparison","props":{"title":"Antes e depois","leftTitle":"Mês anterior","leftBody":"- Item 1\n- Item 2","rightTitle":"Mês atual","rightBody":"- Item 1\n- Item 2"}},
   {"id":"s10","type":"next-steps","props":{"title":"Próximos passos","items":["Ação 1","Ação 2","Ação 3"]}},
   {"id":"s11","type":"closing","props":{"title":"Obrigado.","subtitle":"Vamos seguir construindo juntos."}}
 ]'::jsonb),
('Relatório de Sprint',
 'Para fechar uma sprint com objetivo, entregas e aprendizados.',
 true,
 '[
   {"id":"s1","type":"cover","props":{"kicker":"SPRINT","title":"Fechamento de sprint","subtitle":"Resultados e aprendizados do ciclo","period":"Sprint XX"}},
   {"id":"s2","type":"text","props":{"title":"Objetivo da sprint","body":"Descreva o objetivo principal definido no início da sprint."}},
   {"id":"s3","type":"deliverables","props":{"title":"Entregas","items":[{"label":"Entrega 1","done":true},{"label":"Entrega 2","done":true}]}},
   {"id":"s4","type":"text","props":{"title":"Aprendizados","body":"- Aprendizado 1\n- Aprendizado 2\n- Aprendizado 3"}},
   {"id":"s5","type":"next-steps","props":{"title":"Próximos passos","items":["Ação 1","Ação 2"]}},
   {"id":"s6","type":"closing","props":{"title":"Vamos para a próxima.","subtitle":""}}
 ]'::jsonb);
