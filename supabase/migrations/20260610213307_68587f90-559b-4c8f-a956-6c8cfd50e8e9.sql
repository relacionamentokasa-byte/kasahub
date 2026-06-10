CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text DEFAULT 'geral',
  lido boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios leem proprias notificacoes" ON public.notificacoes 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sistema insere notificacoes" ON public.notificacoes 
FOR INSERT WITH CHECK (true);

CREATE POLICY "usuarios atualizam proprias notificacoes" ON public.notificacoes 
FOR UPDATE USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
