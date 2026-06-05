import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface TeamMember {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  phone: string | null;
  roles: AppRole[];
}

export interface TeamInvite {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

const sb = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
};

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw error;
  const { data: roles, error: rErr } = await supabase
    .from("user_roles")
    .select("user_id, role");
  if (rErr) throw rErr;
  const rolesByUser = new Map<string, AppRole[]>();
  for (const r of roles ?? []) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role as AppRole);
    rolesByUser.set(r.user_id, arr);
  }
  return (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    job_title: p.job_title,
    phone: p.phone,
    roles: rolesByUser.get(p.id) ?? [],
  }));
}

export async function setMemberRole(userId: string, role: AppRole) {
  // Replace all roles for the user with this one
  const { error: delErr } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw delErr;
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role });
  if (error) throw error;
}

export async function addMemberRole(userId: string, role: AppRole) {
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role });
  if (error) throw error;
}

export async function removeMemberRole(userId: string, role: AppRole) {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) throw error;
}

export async function fetchInvites(): Promise<TeamInvite[]> {
  const { data, error } = await sb
    .from("team_invites")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TeamInvite[];
}

export async function createInvite(email: string, role: AppRole) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await sb
    .from("team_invites")
    .insert({ email, role, invited_by: u.user?.id, status: "pending" } as never);
  if (error) throw error;
}

export async function deleteInvite(id: string) {
  const { error } = await sb.from("team_invites").delete().eq("id", id);
  if (error) throw error;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  ceo: "CEO",
  gestor: "Gestor",
  operador: "Operador",
  cliente: "Cliente",
};

export const ROLE_COLOR: Record<AppRole, string> = {
  admin: "bg-red-500/15 text-red-300 border-red-500/30",
  ceo: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  gestor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  operador: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cliente: "bg-muted text-muted-foreground",
};
