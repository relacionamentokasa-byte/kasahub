-- Expande a tabela de perfis
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_invite'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_access TIMESTAMP WITH TIME ZONE;

-- Tabela de Convites
CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role_id UUID REFERENCES public.custom_roles(id),
  inviter_id UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_invites TO authenticated;
GRANT ALL ON public.user_invites TO service_role;
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage invites" ON public.user_invites FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE custom_role_id IN (SELECT id FROM custom_roles WHERE name = 'Administrador' OR permissions->'config'->>'view' = 'true')));

-- Controle de Licenciamento em agency_settings
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'Professional';
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS user_limit INTEGER DEFAULT 10;

-- Histórico de Acessos
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'login', 'logout', 'permission_change', etc.
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT ON public.access_logs TO authenticated;
GRANT ALL ON public.access_logs TO service_role;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own logs" ON public.access_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can see all logs" ON public.access_logs FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE custom_role_id IN (SELECT id FROM custom_roles WHERE name = 'Administrador')));

-- Atualiza perfis de sistema com permissões padrão se existirem
-- (Isso assume que os perfis já podem ter sido criados ou serão criados via UI/App)
-- Por segurança, garantimos que o perfil Administrador tenha tudo.
UPDATE public.custom_roles SET permissions = '{
  "dashboard": {"view": true}, "crm": {"view": true, "create": true, "edit": true, "delete": true, "approve": true, "export": true},
  "clientes": {"view": true, "create": true, "edit": true, "delete": true, "approve": true, "export": true},
  "propostas": {"view": true, "create": true, "edit": true, "delete": true, "approve": true, "export": true},
  "projetos": {"view": true, "create": true, "edit": true, "delete": true, "approve": true, "export": true},
  "jobs": {"view": true, "create": true, "edit": true, "delete": true, "approve": true, "export": true},
  "financeiro": {"view": true, "create": true, "edit": true, "delete": true, "approve": true, "export": true},
  "relatorios": {"view": true, "create": true, "edit": true, "delete": true, "approve": true, "export": true},
  "config": {"view": true, "create": true, "edit": true, "delete": true, "approve": true, "export": true},
  "parceiros": {"view": true, "create": true, "edit": true, "delete": true, "approve": true, "export": true}
}' WHERE name = 'Administrador' AND is_system = true;
