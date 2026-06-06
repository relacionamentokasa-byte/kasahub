ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_volume TEXT DEFAULT 'medium' CHECK (sound_volume IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS sound_mentions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_approvals BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_jobs BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_agenda BOOLEAN DEFAULT true;

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;