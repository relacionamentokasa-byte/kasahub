import { supabase } from "@/integrations/supabase/client";
import { type ProfileWithRole } from "./permissions-api";

export type UserStatus = "active" | "inactive" | "suspended" | "pending_invite";

export interface UserProfile extends ProfileWithRole {
  email?: string;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  status: UserStatus;
  last_access: string | null;
  created_at: string;
}

export interface UserInvite {
  id: string;
  email: string;
  full_name: string;
  role_id: string | null;
  inviter_id: string;
  token: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
  expires_at: string;
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, custom_roles:custom_role_id(name, permissions)")
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data as unknown as UserProfile[];
}

export async function fetchInvites(): Promise<UserInvite[]> {
  const { data, error } = await supabase
    .from("user_invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as UserInvite[];
}

export async function createInvite(invite: { email: string; full_name: string; role_id: string | null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("user_invites")
    .insert({
      email: invite.email,
      full_name: invite.full_name,
      custom_role_id: invite.role_id,
      inviter_id: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInvite(id: string) {
  const { error } = await supabase.from("user_invites").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteUser(userId: string) {
  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) throw error;
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", userId);
  if (error) throw error;
}

export async function fetchAccessLogs(userId?: string) {
  let query = supabase.from("access_logs").select("*").order("created_at", { ascending: false }).limit(50);
  if (userId) {
    query = query.eq("user_id", userId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
