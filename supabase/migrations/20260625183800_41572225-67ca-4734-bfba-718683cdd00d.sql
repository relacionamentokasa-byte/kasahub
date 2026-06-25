
-- Enums
CREATE TYPE public.editorial_social_network AS ENUM ('instagram','youtube','tiktok','linkedin','facebook','other');
CREATE TYPE public.editorial_content_type AS ENUM ('reels','static','carousel');
CREATE TYPE public.editorial_post_status AS ENUM ('planned','in_production','review','approved');
CREATE TYPE public.script_content_type AS ENUM ('reels','youtube','story','live','event','institutional','other');
CREATE TYPE public.script_platform AS ENUM ('instagram','youtube','tiktok','linkedin','facebook','other');
CREATE TYPE public.script_video_format AS ENUM ('vertical','horizontal','square');
CREATE TYPE public.script_status AS ENUM ('draft','review','approved');

-- editorial_posts
CREATE TABLE public.editorial_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  social_network public.editorial_social_network NOT NULL,
  content_type public.editorial_content_type NOT NULL,
  description TEXT,
  status public.editorial_post_status NOT NULL DEFAULT 'planned',
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_editorial_posts_client_date ON public.editorial_posts(client_id, scheduled_at);
CREATE INDEX idx_editorial_posts_job ON public.editorial_posts(job_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_posts TO authenticated;
GRANT ALL ON public.editorial_posts TO service_role;

ALTER TABLE public.editorial_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team manages editorial posts" ON public.editorial_posts
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Portal user views own editorial posts" ON public.editorial_posts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.auth_user_id = auth.uid() AND cpu.client_id = editorial_posts.client_id
  ));

CREATE TRIGGER editorial_posts_updated_at
  BEFORE UPDATE ON public.editorial_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- scripts
CREATE TABLE public.scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type public.script_content_type NOT NULL,
  platform public.script_platform NOT NULL,
  estimated_duration_sec INTEGER,
  video_format public.script_video_format,
  status public.script_status NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scripts_client ON public.scripts(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team manages scripts" ON public.scripts
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Portal user views approved scripts" ON public.scripts
  FOR SELECT TO authenticated
  USING (
    status = 'approved' AND EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.auth_user_id = auth.uid() AND cpu.client_id = scripts.client_id
    )
  );

CREATE OR REPLACE FUNCTION public.fn_scripts_set_client()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT client_id INTO NEW.client_id FROM public.jobs WHERE id = NEW.job_id;
  IF NEW.client_id IS NULL THEN
    RAISE EXCEPTION 'Job % não tem cliente vinculado', NEW.job_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER scripts_set_client
  BEFORE INSERT OR UPDATE OF job_id ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.fn_scripts_set_client();

CREATE TRIGGER scripts_updated_at
  BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- script_scenes
CREATE TABLE public.script_scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL DEFAULT 1,
  visual TEXT NOT NULL DEFAULT '',
  speech TEXT,
  duration_sec INTEGER,
  production_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_script_scenes_script ON public.script_scenes(script_id, scene_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_scenes TO authenticated;
GRANT ALL ON public.script_scenes TO service_role;

ALTER TABLE public.script_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team manages script scenes" ON public.script_scenes
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Portal user views scenes of approved scripts" ON public.script_scenes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.scripts s
    JOIN public.client_portal_users cpu ON cpu.client_id = s.client_id
    WHERE s.id = script_scenes.script_id
      AND s.status = 'approved'
      AND cpu.auth_user_id = auth.uid()
  ));

CREATE TRIGGER script_scenes_updated_at
  BEFORE UPDATE ON public.script_scenes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- job_stages: editorial mapping
ALTER TABLE public.job_stages
  ADD COLUMN IF NOT EXISTS editorial_status public.editorial_post_status;

-- Sync trigger: when job stage changes and is linked to an editorial post
CREATE OR REPLACE FUNCTION public.fn_sync_editorial_status_from_job()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.editorial_post_status;
BEGIN
  IF NEW.stage_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.stage_id IS NOT DISTINCT FROM NEW.stage_id THEN
    RETURN NEW;
  END IF;
  SELECT editorial_status INTO v_status FROM public.job_stages WHERE id = NEW.stage_id;
  IF v_status IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE public.editorial_posts
     SET status = v_status, updated_at = now()
   WHERE job_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_sync_editorial_status ON public.jobs;
CREATE TRIGGER jobs_sync_editorial_status
  AFTER INSERT OR UPDATE OF stage_id ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_editorial_status_from_job();
