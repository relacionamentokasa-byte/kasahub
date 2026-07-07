
CREATE TABLE public.presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentations TO authenticated;
GRANT ALL ON public.presentations TO service_role;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage presentations" ON public.presentations FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE TRIGGER trg_presentations_updated BEFORE UPDATE ON public.presentations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.presentation_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  layout TEXT NOT NULL DEFAULT 'content' CHECK (layout IN ('cover','content','image','split','quote','closing')),
  eyebrow TEXT,
  title TEXT,
  subtitle TEXT,
  body TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentation_slides TO authenticated;
GRANT ALL ON public.presentation_slides TO service_role;
ALTER TABLE public.presentation_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage presentation slides" ON public.presentation_slides FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE INDEX idx_presentation_slides_pres ON public.presentation_slides(presentation_id, order_index);
