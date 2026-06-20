
-- 1. Tabela lead_sources
CREATE TABLE public.lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  default_stage_id uuid REFERENCES public.lead_stages(id) ON DELETE SET NULL,
  notify_user_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  -- Landing customization
  landing_headline text,
  landing_subheadline text,
  landing_description text,
  landing_cta_label text DEFAULT 'Quero falar com a Kasa',
  landing_logo_url text,
  landing_hero_image_url text,
  landing_bg_color text,
  landing_accent_color text,
  landing_benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  landing_testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
  landing_form_fields jsonb NOT NULL DEFAULT '["name","email","phone","message"]'::jsonb,
  landing_success_message text,
  landing_redirect_url text,
  pixel_meta_id text,
  gtag_id text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_sources TO authenticated;
GRANT SELECT ON public.lead_sources TO anon;
GRANT ALL ON public.lead_sources TO service_role;

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team manages lead sources" ON public.lead_sources
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Anyone can read active lead sources" ON public.lead_sources
  FOR SELECT TO anon
  USING (is_active = true);

CREATE TRIGGER trg_lead_sources_updated
  BEFORE UPDATE ON public.lead_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lead_sources_slug ON public.lead_sources(slug);
CREATE INDEX idx_lead_sources_active ON public.lead_sources(is_active);

-- 2. Tabela lead_source_submissions (log)
CREATE TABLE public.lead_source_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.lead_sources(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  status text NOT NULL DEFAULT 'created',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_source_submissions TO authenticated;
GRANT ALL ON public.lead_source_submissions TO service_role;

ALTER TABLE public.lead_source_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team reads submissions" ON public.lead_source_submissions
  FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE INDEX idx_lss_source ON public.lead_source_submissions(source_id, created_at DESC);
CREATE INDEX idx_lss_lead ON public.lead_source_submissions(lead_id);

-- 3. Colunas em leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.lead_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS referrer_url text,
  ADD COLUMN IF NOT EXISTS landing_page_url text;

CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);

-- 4. Função de upsert
CREATE OR REPLACE FUNCTION public.fn_upsert_lead_from_source(
  p_source_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_company text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_utm jsonb DEFAULT '{}'::jsonb,
  p_referrer text DEFAULT NULL,
  p_landing_url text DEFAULT NULL,
  p_raw_payload jsonb DEFAULT '{}'::jsonb,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source RECORD;
  v_existing_id uuid;
  v_lead_id uuid;
  v_stage_id uuid;
  v_status text := 'created';
  v_email_norm text := lower(nullif(trim(p_email), ''));
  v_phone_norm text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_user_id uuid;
  v_notes text;
BEGIN
  SELECT * INTO v_source FROM public.lead_sources WHERE id = p_source_id;
  IF NOT FOUND OR NOT v_source.is_active THEN
    RAISE EXCEPTION 'Fonte de lead inativa ou inexistente';
  END IF;

  -- Estágio: default da fonte, ou primeiro estágio do funil
  v_stage_id := v_source.default_stage_id;
  IF v_stage_id IS NULL THEN
    SELECT id INTO v_stage_id FROM public.lead_stages
      WHERE is_won = false AND is_lost = false
      ORDER BY order_index ASC LIMIT 1;
  END IF;

  -- Dedupe: tenta achar por email ou phone
  IF v_email_norm IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM public.leads
      WHERE lower(email) = v_email_norm
      ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_existing_id IS NULL AND length(v_phone_norm) >= 8 THEN
    SELECT id INTO v_existing_id FROM public.leads
      WHERE regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_phone_norm
      ORDER BY created_at DESC LIMIT 1;
  END IF;

  v_notes := CASE WHEN p_message IS NOT NULL AND length(trim(p_message)) > 0
                  THEN '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] ' || p_message
                  ELSE NULL END;

  IF v_existing_id IS NOT NULL THEN
    -- Update
    v_status := 'updated';
    UPDATE public.leads SET
      name = COALESCE(NULLIF(trim(p_name), ''), name),
      email = COALESCE(NULLIF(trim(p_email), ''), email),
      phone = COALESCE(NULLIF(trim(p_phone), ''), phone),
      company = COALESCE(NULLIF(trim(p_company), ''), company),
      notes = CASE WHEN v_notes IS NOT NULL
                   THEN COALESCE(notes || E'\n\n', '') || v_notes
                   ELSE notes END,
      utm_source = COALESCE(p_utm->>'source', utm_source),
      utm_medium = COALESCE(p_utm->>'medium', utm_medium),
      utm_campaign = COALESCE(p_utm->>'campaign', utm_campaign),
      utm_content = COALESCE(p_utm->>'content', utm_content),
      utm_term = COALESCE(p_utm->>'term', utm_term),
      referrer_url = COALESCE(p_referrer, referrer_url),
      landing_page_url = COALESCE(p_landing_url, landing_page_url),
      updated_at = now()
    WHERE id = v_existing_id;
    v_lead_id := v_existing_id;
  ELSE
    -- Insert
    INSERT INTO public.leads (
      name, email, phone, company, source, source_id, stage_id, notes,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      referrer_url, landing_page_url
    ) VALUES (
      COALESCE(NULLIF(trim(p_name), ''), 'Lead sem nome'),
      NULLIF(trim(p_email), ''),
      NULLIF(trim(p_phone), ''),
      NULLIF(trim(p_company), ''),
      v_source.name,
      v_source.id,
      v_stage_id,
      v_notes,
      p_utm->>'source', p_utm->>'medium', p_utm->>'campaign',
      p_utm->>'content', p_utm->>'term',
      p_referrer, p_landing_url
    )
    RETURNING id INTO v_lead_id;
  END IF;

  -- Log submission
  INSERT INTO public.lead_source_submissions (source_id, lead_id, payload, ip, user_agent, status)
  VALUES (p_source_id, v_lead_id, p_raw_payload, p_ip, p_user_agent, v_status);

  -- Timeline event
  INSERT INTO public.client_timeline_events (lead_id, type, title, description, metadata)
  VALUES (
    v_lead_id,
    'lead_captured',
    CASE WHEN v_status = 'created' THEN 'Novo lead capturado' ELSE 'Lead atualizado via captação' END,
    'Fonte: ' || v_source.name,
    jsonb_build_object('source_id', v_source.id, 'source_name', v_source.name, 'status', v_status)
  );

  -- Notificações
  IF array_length(v_source.notify_user_ids, 1) > 0 THEN
    FOREACH v_user_id IN ARRAY v_source.notify_user_ids LOOP
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
      VALUES (
        v_user_id,
        '🎯 Novo lead — ' || v_source.name,
        COALESCE(NULLIF(trim(p_name), ''), 'Alguém') || ' acabou de se cadastrar via ' || v_source.name,
        'lead',
        '/crm?leadId=' || v_lead_id
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object('lead_id', v_lead_id, 'status', v_status);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_upsert_lead_from_source(uuid, text, text, text, text, text, jsonb, text, text, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_upsert_lead_from_source(uuid, text, text, text, text, text, jsonb, text, text, jsonb, text, text) TO service_role, authenticated;
