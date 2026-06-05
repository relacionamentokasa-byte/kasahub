import { supabase } from "@/integrations/supabase/client";

export const MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "crm", label: "CRM" },
  { id: "clientes", label: "Clientes" },
  { id: "propostas", label: "Propostas" },
  { id: "projetos", label: "Projetos" },
  { id: "jobs", label: "Jobs" },
  { id: "financeiro", label: "Financeiro" },
  { id: "relatorios", label: "Relatórios" },
  { id: "config", label: "Configurações" },
] as const;

export const ACTIONS = [
  { id: "view", label: "Visualizar" },
  { id: "create", label: "Criar" },
  { id: "edit", label: "Editar" },
  { id: "delete", label: "Excluir" },
  { id: "export", label: "Exportar" },
  { id: "approve", label: "Aprovar" },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];
export type ActionId = (typeof ACTIONS)[number]["id"];
export type PermissionMap = Partial<Record<ModuleId, Partial<Record<ActionId, boolean>>>>;

export type CustomRole = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: PermissionMap;
  created_at: string;
  updated_at: string;
};

export async function fetchCustomRoles(): Promise<CustomRole[]> {
  const { data, error } = await supabase
    .from("custom_roles")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as CustomRole[];
}

export async function upsertCustomRole(
  role: Partial<CustomRole> & { name: string; permissions: PermissionMap }
): Promise<CustomRole> {
  if (role.id) {
    const { data, error } = await supabase
      .from("custom_roles")
      .update({
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      })
      .eq("id", role.id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as CustomRole;
  }
  const { data, error } = await supabase
    .from("custom_roles")
    .insert({
      name: role.name,
      description: role.description ?? null,
      permissions: role.permissions,
      is_system: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CustomRole;
}

export async function deleteCustomRole(id: string): Promise<void> {
  const { error } = await supabase.from("custom_roles").delete().eq("id", id);
  if (error) throw error;
}

export async function assignProfileRole(profileId: string, customRoleId: string | null): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ custom_role_id: customRoleId })
    .eq("id", profileId);
  if (error) throw error;
}

export type ProfileWithRole = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  custom_role_id: string | null;
};

export async function fetchProfilesWithRoles(): Promise<ProfileWithRole[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, full_name, avatar_url, custom_role_id")
    .order("display_name");
  if (error) throw error;
  return (data ?? []) as ProfileWithRole[];
}

export async function fetchMyPermissions(): Promise<PermissionMap> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("custom_role_id, custom_roles(permissions)")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) return {};
  const perms = (data as { custom_roles?: { permissions?: PermissionMap } } | null)?.custom_roles?.permissions;
  return perms ?? {};
}

export function canAccess(perms: PermissionMap, module: ModuleId, action: ActionId = "view"): boolean {
  return Boolean(perms[module]?.[action]);
}
