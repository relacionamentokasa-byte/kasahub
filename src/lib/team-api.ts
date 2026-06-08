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

export async function sendInviteEmail(email: string, role: AppRole, fullName?: string) {
  // O Supabase Auth lida com o token de convite quando usamos o método de convite do Admin.
  // Como estamos disparando via Resend, precisamos garantir que o link seja o de convite do Supabase
  // ou que o Supabase envie o email. Mas o usuário pediu para usar Resend com template customizado.
  
  // No fluxo real do Supabase, o convite Admin gera um token.
  // Como o usuário pediu para usar Resend, vamos configurar o Supabase para redirecionar para nossa página de convite.
  const inviteUrl = `${window.location.origin}/auth/invite`;
  
  await sendEmail({
    data: {
      to: email,
      from: "KASA HUB <noreply@kasamkt.com.br>",
      subject: "Você foi convidado para o KASA HUB",
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0c1618; border-radius: 16px; color: #ffffff;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #ffbc45; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; margin: 0;">KASA HUB</h1>
            <p style="color: rgba(255,255,255,0.4); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold; margin-top: 8px;">Inteligência ERP Operacional</p>
          </div>
          
          <p style="font-size: 18px; line-height: 1.6; color: #ffffff; margin-bottom: 24px;">Olá, ${fullName || 'Colaborador'}!</p>
          
          <p style="font-size: 16px; line-height: 1.6; color: rgba(255,255,255,0.8); margin-bottom: 32px;">
            Você foi convidado para acessar o <strong>Kasa Hub</strong>, a plataforma interna da <strong>Kasa Marketing & Consultoria</strong>.
          </p>
          
          <div style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 32px; text-align: center;">
            <p style="font-size: 12px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold; margin: 0 0 8px 0;">Perfil de Acesso Atribuído</p>
            <p style="font-size: 20px; color: #ffbc45; font-weight: bold; margin: 0;">${ROLE_LABEL[role]}</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 40px;">
            <a href="${inviteUrl}" style="background-color: #ffbc45; color: #0c1618; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 10px 20px rgba(255, 188, 69, 0.2);">Acessar o Kasa Hub</a>
          </div>
          
          <p style="font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.4); text-align: center; margin-bottom: 32px;">
            Se o botão acima não funcionar, copie e cole o link no seu navegador:<br>
            <span style="color: #ffbc45; font-family: monospace;">${inviteUrl}</span>
          </p>
          
          <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin-bottom: 32px;">
          
          <p style="font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.3); text-align: center; margin: 0;">
            Este convite foi enviado pela equipe Kasa.<br>
            Se você não esperava este e-mail, pode ignorá-lo.
          </p>
        </div>
      `,
    }
  });
}

export async function createInvite(email: string, role: AppRole, fullName?: string) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await sb
    .from("team_invites")
    .insert({ email, role, invited_by: u.user?.id, status: "pending" } as never);
  if (error) throw error;

  // Enviar convite via Resend
  try {
    await sendInviteEmail(email, role, fullName);
  } catch (e) {
    console.error("Erro ao enviar e-mail de convite:", e);
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
