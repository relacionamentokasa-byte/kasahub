
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages services" ON public.services FOR ALL TO authenticated
  USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));
CREATE POLICY "Authenticated reads services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_job_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  default_duration_days integer NOT NULL DEFAULT 0,
  default_assignee_id uuid,
  initial_stage_id uuid REFERENCES public.job_stages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_job_templates TO authenticated;
GRANT ALL ON public.service_job_templates TO service_role;
ALTER TABLE public.service_job_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages service templates" ON public.service_job_templates FOR ALL TO authenticated
  USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));
CREATE TRIGGER trg_service_templates_updated BEFORE UPDATE ON public.service_job_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_job_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_job_id uuid NOT NULL REFERENCES public.service_job_templates(id) ON DELETE CASCADE,
  content text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_job_checklist TO authenticated;
GRANT ALL ON public.service_job_checklist TO service_role;
ALTER TABLE public.service_job_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages service checklist" ON public.service_job_checklist FOR ALL TO authenticated
  USING (is_team_member(auth.uid())) WITH CHECK (is_team_member(auth.uid()));

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS service_ids uuid[] NOT NULL DEFAULT '{}';

-- Seed
WITH seed(nm, cat, jobs) AS (
  VALUES
    ('Gestão de Redes Sociais','Social Media',  ARRAY['Planejamento','Estratégia','Copy','Design','Aprovação','Publicação','Relatório']),
    ('Tráfego Pago','Performance',              ARRAY['Planejamento','Criativos','Configuração','Lançamento','Otimização','Relatório']),
    ('Site Institucional','Web',                ARRAY['Briefing','Wireframe','Design','Desenvolvimento','Homologação','Publicação']),
    ('Landing Page','Web',                      ARRAY['Briefing','Wireframe','Design','Desenvolvimento','Publicação']),
    ('Branding','Identidade',                   ARRAY['Briefing','Pesquisa','Conceito','Aplicações','Manual']),
    ('Consultoria','Estratégia',                ARRAY['Diagnóstico','Análise','Recomendações','Apresentação']),
    ('Produção de Conteúdo','Conteúdo',         ARRAY['Pauta','Roteiro','Produção','Edição','Publicação'])
), ins AS (
  INSERT INTO public.services (name, category, is_active)
  SELECT nm, cat, true FROM seed
  RETURNING id, name
)
INSERT INTO public.service_job_templates (service_id, name, order_index, default_duration_days)
SELECT ins.id, j.job, j.idx - 1, 3
FROM ins
JOIN seed ON seed.nm = ins.name
CROSS JOIN LATERAL unnest(seed.jobs) WITH ORDINALITY AS j(job, idx);
