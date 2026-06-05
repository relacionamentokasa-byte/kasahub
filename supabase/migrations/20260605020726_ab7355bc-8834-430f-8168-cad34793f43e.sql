
-- Custom roles (perfis) with module + action permissions
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_roles TO authenticated;
GRANT ALL ON public.custom_roles TO service_role;

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read custom roles" ON public.custom_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage custom roles" ON public.custom_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE TRIGGER trg_custom_roles_updated_at
BEFORE UPDATE ON public.custom_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link profile -> custom role
ALTER TABLE public.profiles ADD COLUMN custom_role_id uuid REFERENCES public.custom_roles(id) ON DELETE SET NULL;

-- Permission check helper
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (cr.permissions -> _module ->> _action)::boolean
       FROM public.profiles p
       JOIN public.custom_roles cr ON cr.id = p.custom_role_id
      WHERE p.id = _user_id),
    false
  ) OR has_role(_user_id, 'admin'::app_role);
$$;

-- Seed 9 default profiles
-- Modules: dashboard, crm, clientes, projetos, jobs, financeiro, relatorios, config
-- Actions: view, create, edit, delete, export, approve
INSERT INTO public.custom_roles (name, description, is_system, permissions) VALUES
('Administrador', 'Acesso total a todos os módulos e ações.', true, '{
  "dashboard":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true},
  "crm":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true},
  "clientes":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true},
  "projetos":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true},
  "jobs":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true},
  "financeiro":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true},
  "relatorios":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true},
  "config":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true}
}'::jsonb),
('Comercial', 'Foco em CRM, propostas e clientes.', true, '{
  "dashboard":{"view":true},
  "crm":{"view":true,"create":true,"edit":true,"delete":true,"export":true},
  "clientes":{"view":true,"create":true,"edit":true,"export":true},
  "projetos":{"view":true},
  "jobs":{"view":true},
  "relatorios":{"view":true}
}'::jsonb),
('Atendimento', 'Suporte ao cliente e acompanhamento de jobs.', true, '{
  "dashboard":{"view":true},
  "clientes":{"view":true,"edit":true},
  "projetos":{"view":true},
  "jobs":{"view":true,"create":true,"edit":true},
  "crm":{"view":true}
}'::jsonb),
('Social Media', 'Criação, planejamento e aprovação de conteúdo.', true, '{
  "dashboard":{"view":true},
  "clientes":{"view":true},
  "projetos":{"view":true,"edit":true},
  "jobs":{"view":true,"create":true,"edit":true,"approve":true}
}'::jsonb),
('Designer', 'Execução criativa de jobs e projetos.', true, '{
  "dashboard":{"view":true},
  "clientes":{"view":true},
  "projetos":{"view":true},
  "jobs":{"view":true,"create":true,"edit":true}
}'::jsonb),
('Gestor de Projetos', 'Gestão completa de projetos e equipe.', true, '{
  "dashboard":{"view":true,"export":true},
  "crm":{"view":true},
  "clientes":{"view":true,"create":true,"edit":true},
  "projetos":{"view":true,"create":true,"edit":true,"delete":true,"approve":true},
  "jobs":{"view":true,"create":true,"edit":true,"delete":true,"approve":true},
  "relatorios":{"view":true,"export":true}
}'::jsonb),
('Financeiro', 'Gestão financeira da agência.', true, '{
  "dashboard":{"view":true},
  "clientes":{"view":true},
  "financeiro":{"view":true,"create":true,"edit":true,"export":true,"approve":true},
  "relatorios":{"view":true,"export":true}
}'::jsonb),
('Freelancer', 'Acesso restrito a jobs atribuídos.', true, '{
  "jobs":{"view":true,"edit":true}
}'::jsonb),
('Colaborador', 'Acesso básico de visualização.', true, '{
  "dashboard":{"view":true},
  "clientes":{"view":true},
  "projetos":{"view":true},
  "jobs":{"view":true}
}'::jsonb);
