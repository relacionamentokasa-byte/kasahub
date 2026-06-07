CREATE TABLE public.error_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    stack TEXT,
    file_path TEXT,
    line_number INTEGER,
    column_number INTEGER,
    page_url TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert error logs" ON public.error_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can select error logs" ON public.error_logs
    FOR SELECT TO service_role USING (true);