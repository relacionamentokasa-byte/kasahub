-- Add google_event_id to calendar_events
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;

-- Create google_calendar_connections table
CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    google_account_email TEXT,
    selected_calendar_id TEXT DEFAULT 'primary',
    is_sync_enabled BOOLEAN DEFAULT false,
    is_bidirectional BOOLEAN DEFAULT false,
    last_pulled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_connections TO authenticated;
GRANT ALL ON public.google_calendar_connections TO service_role;

-- Policies
CREATE POLICY "Users can manage their own google calendar connection" ON public.google_calendar_connections
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_google_calendar_connections_updated_at
    BEFORE UPDATE ON public.google_calendar_connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
