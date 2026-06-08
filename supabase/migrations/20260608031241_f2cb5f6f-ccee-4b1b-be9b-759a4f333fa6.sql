-- Create a temporary table to store new roles data
CREATE TEMP TABLE new_roles (
  name text,
  description text,
  permissions jsonb
);

INSERT INTO new_roles (name, description, permissions) VALUES
('Administrador', 'Acesso total a todos os módulos e configurações do sistema.', '{"dashboard": {"view": true}, "crm": {"view": true, "create": true, "edit": true, "delete": true, "export": true}, "propostas": {"view": true, "create": true, "edit": true, "delete": true, "export": true}, "clientes": {"view": true, "create": true, "edit": true, "delete": true, "export": true}, "projetos": {"view": true, "create": true, "edit": true, "delete": true, "export": true, "approve": true}, "jobs": {"view": true, "create": true, "edit": true, "delete": true, "export": true, "approve": true}, "parceiros": {"view": true, "create": true, "edit": true, "delete": true, "export": true}, "financeiro": {"view": true, "create": true, "edit": true, "delete": true, "export": true, "approve": true}, "relatorios": {"view": true, "export": true}, "config": {"view": true, "create": true, "edit": true, "delete": true}}'),
('Gestor', 'Acesso a módulos operacionais. Sem acesso a configurações ou dados financeiros sensíveis.', '{"dashboard": {"view": true}, "crm": {"view": true, "create": true, "edit": true, "delete": true, "export": true}, "propostas": {"view": true, "create": true, "edit": true, "delete": true, "export": true}, "clientes": {"view": true, "create": true, "edit": true, "delete": true, "export": true}, "projetos": {"view": true, "create": true, "edit": true, "delete": true, "export": true, "approve": true}, "jobs": {"view": true, "create": true, "edit": true, "delete": true, "export": true, "approve": true}, "parceiros": {"view": true, "create": true, "edit": true, "delete": true, "export": true}}'),
('Equipe Interna', 'Acesso focado em execução de Jobs e Tarefas.', '{"dashboard": {"view": true}, "jobs": {"view": true, "create": true, "edit": true}, "projetos": {"view": true}}'),
('Representante', 'Acesso restrito a vendas: CRM e Propostas.', '{"dashboard": {"view": true}, "crm": {"view": true, "create": true, "edit": true}, "propostas": {"view": true, "create": true, "edit": true}}'),
('Financeiro', 'Acesso exclusivo ao módulo Financeiro e Relatórios.', '{"dashboard": {"view": true}, "financeiro": {"view": true, "create": true, "edit": true, "delete": true, "export": true, "approve": true}, "relatorios": {"view": true, "export": true}}');

-- Update existing roles that match the name
UPDATE public.custom_roles cr
SET 
  description = nr.description,
  permissions = nr.permissions,
  is_system = true
FROM new_roles nr
WHERE cr.name = nr.name;

-- Insert roles that don't exist yet
INSERT INTO public.custom_roles (name, description, is_system, permissions)
SELECT nr.name, nr.description, true, nr.permissions
FROM new_roles nr
WHERE NOT EXISTS (SELECT 1 FROM public.custom_roles WHERE name = nr.name);

-- Handle roles that are no longer in our 5-set (optional, but requested "Substituir")
-- To avoid FK errors, we'll reassign users to 'Equipe Interna' if their role is being deleted
DO $$
DECLARE
  internal_team_id uuid;
BEGIN
  SELECT id INTO internal_team_id FROM public.custom_roles WHERE name = 'Equipe Interna' LIMIT 1;
  
  -- Reassign users from other roles
  UPDATE public.profiles
  SET custom_role_id = internal_team_id
  WHERE custom_role_id NOT IN (SELECT id FROM public.custom_roles WHERE name IN ('Administrador', 'Gestor', 'Equipe Interna', 'Representante', 'Financeiro'));

  -- Reassign invites
  UPDATE public.user_invites
  SET role_id = internal_team_id
  WHERE role_id NOT IN (SELECT id FROM public.custom_roles WHERE name IN ('Administrador', 'Gestor', 'Equipe Interna', 'Representante', 'Financeiro'));

  -- Now safe to delete old roles
  DELETE FROM public.custom_roles 
  WHERE name NOT IN ('Administrador', 'Gestor', 'Equipe Interna', 'Representante', 'Financeiro');
END $$;

-- Set Ariel Matos as Administrador
DO $$
DECLARE
  admin_role_id uuid;
BEGIN
  SELECT id INTO admin_role_id FROM public.custom_roles WHERE name = 'Administrador' LIMIT 1;
  
  UPDATE public.profiles 
  SET custom_role_id = admin_role_id 
  WHERE display_name ILIKE '%Ariel Matos%';

  -- Also ensure he has the database role 'admin' in user_roles for RLS policies
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin'::app_role FROM public.profiles WHERE display_name ILIKE '%Ariel Matos%'
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;