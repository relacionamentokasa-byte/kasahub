import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export async function fetchCurrentUserRoles(): Promise<AppRole[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id);
  if (error) throw error;
  return (data ?? []).map((r) => r.role as AppRole);
}

export function hasAnyRole(roles: AppRole[], allowed: AppRole[]) {
  return roles.some((r) => allowed.includes(r));
}
