import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "./email.functions";
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

export async function sendInviteEmail(email: string, role: AppRole) {
  const inviteUrl = `${window.location.origin}/auth`;
  await sendEmail({
    to: email,
    from: "KASA HUB <noreply@kasamkt.com.br>",
    subject: "Você foi convidado para o KASA HUB",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #0c1618;">KASA HUB</h1>
        <p style="font-size: 16px; color: #333;">Olá!</p>
        <p style="font-size: 16px; color: #333;">Você foi convidado para participar da equipe no <strong>KASA HUB</strong> como <strong>${ROLE_LABEL[role]}</strong>.</p>
        <p style="font-size: 16px; color: #333;">Clique no botão abaixo para criar sua conta e começar a usar o sistema:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #ffbc45; color: #0c1618; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Aceitar Convite</a>
        </div>
        <p style="font-size: 14px; color: #777;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
        <p style="font-size: 14px; color: #777;">${inviteUrl}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">Kasa Marketing Consultoria</p>
      </div>
    `,
  });
}

export async function createInvite(email: string, role: AppRole) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await sb
    .from("team_invites")
    .insert({ email, role, invited_by: u.user?.id, status: "pending" } as never);
  if (error) throw error;

  // Enviar convite via Resend
  try {
    await sendInviteEmail(email, role);
  } catch (e) {
    console.error("Erro ao enviar e-mail de convite:", e);
    // Não travamos o processo se o e-mail falhar, o registro do convite já foi feito
  }
}

export async function deleteInvite(id: string) {
  const { error } = await sb.from("team_invites").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteTeamMember(userId: string) {
  const { error } = await supabase.from("profiles").delete().eq("id", userId);
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
