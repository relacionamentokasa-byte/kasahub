
-- Kasa AI: threads
CREATE TABLE public.ai_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_threads TO authenticated;
GRANT ALL ON public.ai_threads TO service_role;
ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_threads_own_all" ON public.ai_threads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE INDEX ai_threads_user_updated_idx ON public.ai_threads (user_id, updated_at DESC);
CREATE TRIGGER ai_threads_updated_at
  BEFORE UPDATE ON public.ai_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Kasa AI: messages
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL DEFAULT '',
  parts JSONB,
  context_used JSONB,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_messages_own_all" ON public.ai_messages
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE INDEX ai_messages_thread_idx ON public.ai_messages (thread_id, created_at);

-- Biblioteca
CREATE TABLE public.kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  segment TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  content TEXT,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_ref TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorited_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kb_documents TO authenticated;
GRANT ALL ON public.kb_documents TO service_role;
ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb_team_read" ON public.kb_documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_team_insert" ON public.kb_documents
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "kb_owner_or_admin_update" ON public.kb_documents
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "kb_owner_or_admin_delete" ON public.kb_documents
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX kb_documents_category_idx ON public.kb_documents (category);
CREATE INDEX kb_documents_client_idx ON public.kb_documents (client_id);
CREATE INDEX kb_documents_created_idx ON public.kb_documents (created_at DESC);
CREATE TRIGGER kb_documents_updated_at
  BEFORE UPDATE ON public.kb_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies para bucket kasa-knowledge
CREATE POLICY "kb_files_team_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kasa-knowledge');
CREATE POLICY "kb_files_team_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kasa-knowledge' AND owner = auth.uid());
CREATE POLICY "kb_files_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kasa-knowledge' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (bucket_id = 'kasa-knowledge');
CREATE POLICY "kb_files_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'kasa-knowledge' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
