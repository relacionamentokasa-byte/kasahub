
-- =========================================================
-- 1. ONBOARDING TEMPLATES
-- =========================================================
CREATE TABLE public.onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_templates TO authenticated;
GRANT ALL ON public.onboarding_templates TO service_role;
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage onboarding templates"
ON public.onboarding_templates FOR ALL TO authenticated
USING (public.is_team_member(auth.uid()))
WITH CHECK (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_onboarding_templates_updated
BEFORE UPDATE ON public.onboarding_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. TEMPLATE STEPS
-- =========================================================
CREATE TABLE public.onboarding_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  responsible_type TEXT NOT NULL DEFAULT 'agency' CHECK (responsible_type IN ('agency','client','both')),
  days_after_start INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_template_steps TO authenticated;
GRANT ALL ON public.onboarding_template_steps TO service_role;
ALTER TABLE public.onboarding_template_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage onboarding template steps"
ON public.onboarding_template_steps FOR ALL TO authenticated
USING (public.is_team_member(auth.uid()))
WITH CHECK (public.is_team_member(auth.uid()));

CREATE INDEX idx_onb_tpl_steps_tpl ON public.onboarding_template_steps(template_id, order_index);

-- =========================================================
-- 3. ONBOARDING INSTANCES
-- =========================================================
CREATE TABLE public.onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.onboarding_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','paused','cancelled')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_end_date DATE,
  completed_at TIMESTAMPTZ,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboardings TO authenticated;
GRANT ALL ON public.onboardings TO service_role;
ALTER TABLE public.onboardings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage onboardings"
ON public.onboardings FOR ALL TO authenticated
USING (public.is_team_member(auth.uid()))
WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Portal users can view their onboarding"
ON public.onboardings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.auth_user_id = auth.uid()
      AND cpu.client_id = onboardings.client_id
  )
);

CREATE INDEX idx_onboardings_client ON public.onboardings(client_id);
CREATE INDEX idx_onboardings_status ON public.onboardings(status);

CREATE TRIGGER trg_onboardings_updated
BEFORE UPDATE ON public.onboardings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. ONBOARDING STEPS
-- =========================================================
CREATE TABLE public.onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.onboardings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  responsible_type TEXT NOT NULL DEFAULT 'agency' CHECK (responsible_type IN ('agency','client','both')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','blocked','skipped')),
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_steps TO authenticated;
GRANT ALL ON public.onboarding_steps TO service_role;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage onboarding steps"
ON public.onboarding_steps FOR ALL TO authenticated
USING (public.is_team_member(auth.uid()))
WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Portal users can view their onboarding steps"
ON public.onboarding_steps FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.onboardings o
    JOIN public.client_portal_users cpu ON cpu.client_id = o.client_id
    WHERE o.id = onboarding_steps.onboarding_id
      AND cpu.auth_user_id = auth.uid()
  )
);

CREATE INDEX idx_onb_steps_onb ON public.onboarding_steps(onboarding_id, order_index);

CREATE TRIGGER trg_onboarding_steps_updated
BEFORE UPDATE ON public.onboarding_steps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 5. PROGRESS RECALC TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.recalc_onboarding_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_onb UUID;
  v_total INT;
  v_done INT;
  v_pct INT;
BEGIN
  v_onb := COALESCE(NEW.onboarding_id, OLD.onboarding_id);

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('done','skipped'))
    INTO v_total, v_done
  FROM public.onboarding_steps
  WHERE onboarding_id = v_onb;

  v_pct := CASE WHEN v_total > 0 THEN (v_done * 100 / v_total) ELSE 0 END;

  UPDATE public.onboardings
     SET progress_percentage = v_pct,
         status = CASE
           WHEN v_pct = 100 AND status <> 'completed' THEN 'completed'
           WHEN v_pct < 100 AND status = 'completed' THEN 'in_progress'
           ELSE status
         END,
         completed_at = CASE
           WHEN v_pct = 100 AND completed_at IS NULL THEN now()
           WHEN v_pct < 100 THEN NULL
           ELSE completed_at
         END
   WHERE id = v_onb;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_onb_progress
AFTER INSERT OR UPDATE OF status OR DELETE ON public.onboarding_steps
FOR EACH ROW EXECUTE FUNCTION public.recalc_onboarding_progress();

-- =========================================================
-- 6. AUTO-CREATE ONBOARDING ON PROPOSAL ACCEPTANCE
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_onboarding_on_proposal_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_step RECORD;
  v_onb_id UUID;
  v_max_days INT := 0;
BEGIN
  IF NEW.status NOT IN ('accepted','converted','signed','Aprovada') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT NULL AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- evita duplicidade
  IF EXISTS (SELECT 1 FROM public.onboardings WHERE proposal_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- pega template default ativo
  SELECT * INTO v_template
    FROM public.onboarding_templates
   WHERE is_default = true AND is_active = true
   ORDER BY created_at ASC
   LIMIT 1;

  IF v_template.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(days_after_start), 0) INTO v_max_days
    FROM public.onboarding_template_steps
   WHERE template_id = v_template.id;

  INSERT INTO public.onboardings (
    client_id, proposal_id, template_id, title, description,
    start_date, expected_end_date, owner_id, created_by
  ) VALUES (
    NEW.client_id, NEW.id, v_template.id,
    'Onboarding: ' || COALESCE(NEW.title, 'Novo Cliente'),
    v_template.description,
    CURRENT_DATE,
    CURRENT_DATE + (v_max_days || ' days')::interval,
    NEW.owner_id, NEW.owner_id
  ) RETURNING id INTO v_onb_id;

  FOR v_step IN
    SELECT * FROM public.onboarding_template_steps
     WHERE template_id = v_template.id
     ORDER BY order_index ASC, created_at ASC
  LOOP
    INSERT INTO public.onboarding_steps (
      onboarding_id, title, description, responsible_type,
      due_date, order_index
    ) VALUES (
      v_onb_id, v_step.title, v_step.description, v_step.responsible_type,
      CURRENT_DATE + (v_step.days_after_start || ' days')::interval,
      v_step.order_index
    );
  END LOOP;

  -- timeline event
  INSERT INTO public.client_timeline_events (client_id, type, title, description, metadata)
  VALUES (
    NEW.client_id, 'onboarding',
    'Onboarding iniciado',
    'Processo de onboarding criado a partir do modelo "' || v_template.name || '".',
    jsonb_build_object('onboarding_id', v_onb_id, 'template_id', v_template.id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_onboarding_on_proposal_accepted
AFTER INSERT OR UPDATE OF status ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.handle_onboarding_on_proposal_accepted();

-- =========================================================
-- 7. SEED: modelo padrão de onboarding
-- =========================================================
DO $$
DECLARE
  v_tpl_id UUID;
BEGIN
  INSERT INTO public.onboarding_templates (name, description, is_default, is_active)
  VALUES (
    'Onboarding Padrão',
    'Fluxo padrão de boas-vindas e ativação de novos clientes da agência.',
    true, true
  ) RETURNING id INTO v_tpl_id;

  INSERT INTO public.onboarding_template_steps (template_id, title, description, responsible_type, days_after_start, order_index) VALUES
    (v_tpl_id, 'Boas-vindas e apresentação do time', 'E-mail/contato inicial apresentando os responsáveis pela conta e canais oficiais.', 'agency', 0, 0),
    (v_tpl_id, 'Reunião de Kickoff', 'Alinhamento inicial de expectativas, escopo e cronograma.', 'both', 3, 1),
    (v_tpl_id, 'Coleta de materiais e briefing', 'Cliente envia logos, identidade visual, histórico, personas e diretrizes de marca.', 'client', 5, 2),
    (v_tpl_id, 'Acessos e integrações', 'Liberação de Meta Business, Google Ads, Analytics, GMB, domínio e e-mail.', 'client', 7, 3),
    (v_tpl_id, 'Estratégia inicial e planejamento', 'Equipe monta planejamento estratégico e calendário das primeiras entregas.', 'agency', 10, 4),
    (v_tpl_id, 'Apresentação do portal do cliente', 'Tour pelo portal: aprovações, DMEs, acompanhamento de jobs e contratos.', 'agency', 12, 5),
    (v_tpl_id, 'Go Live — início da operação', 'Operação ativa, primeiras entregas em produção e ritmo de reuniões definido.', 'both', 14, 6);
END $$;
