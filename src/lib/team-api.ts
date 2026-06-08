import { supabase } from "@/integrations/supabase/client";
import { sendEmail, sendEmailInternal } from "./email.functions";
import type { Database } from "@/integrations/supabase/types";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  ceo: "CEO",
  gestor: "Gestor",
  operador: "Operador",
  cliente: "Cliente",
};

export const ROLE_COLOR: Record<string, string> = {
  admin: "bg-red-500/15 text-red-300 border-red-500/30",
  ceo: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  gestor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  operador: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cliente: "bg-muted text-muted-foreground",
};

export async function sendInviteEmail(email: string, roleName: string, token: string, fullName?: string) {
  const inviteUrl = `https://kasa-opus.lovable.app/convite?token=${token}`;
  
  const html = `
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
        <p style="font-size: 20px; color: #ffbc45; font-weight: bold; margin: 0;">${roleName}</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 40px;">
        <a href="${inviteUrl}" style="background-color: #ffbc45; color: #0c1618; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 10px 20px rgba(255, 188, 69, 0.2);">Acessar o Kasa Hub</a>
      </div>
      
      <p style="font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.4); text-align: center; margin-bottom: 32px;">
        Se o botão acima não funcionar, copie e cole o link no seu navegador:<br>
        <span style="color: #ffbc45; font-family: monospace; font-size: 11px; word-break: break-all;">${inviteUrl}</span>
      </p>
      
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin-bottom: 32px;">
      
      <p style="font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.3); text-align: center; margin: 0;">
        Este convite foi enviado pela equipe Kasa.<br>
        Se você não esperava este e-mail, pode ignorá-lo.
      </p>
    </div>
  `;

  if (typeof window === "undefined") {
    return sendEmailInternal({
      to: email,
      subject: "Você foi convidado para o KASA HUB",
      html,
    });
  }

  return sendEmail({
    data: {
      to: email,
      from: "KASA HUB <noreply@kasamkt.com.br>",
      subject: "Você foi convidado para o KASA HUB",
      html,
    }
  });
}

export const createInviteServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    email: z.string().email(),
    roleId: z.string().uuid().nullable(),
    fullName: z.string().optional(),
    invitedBy: z.string().uuid(),
  }).parse(input))
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured on server");
    }

    const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get Role Name
    let roleName = "Membro";
    if (data.roleId) {
      const { data: roleData } = await adminClient
        .from("custom_roles")
        .select("name")
        .eq("id", data.roleId)
        .single();
      if (roleData) roleName = roleData.name;
    }

    // 1. Generate Link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: data.email,
      options: {
        data: { full_name: data.fullName, display_name: data.fullName },
        redirectTo: "https://kasa-opus.lovable.app/convite"
      }
    });

    if (linkError) throw linkError;

    const inviteUrl = new URL(linkData.properties.action_link);
    const token = inviteUrl.searchParams.get("token");

    if (!token) throw new Error("Could not generate invitation token");

    // 2. Register in user_invites table
    const { error: dbError } = await adminClient
      .from("user_invites")
      .insert({ 
        email: data.email, 
        full_name: data.fullName || "",
        role_id: data.roleId, 
        inviter_id: data.invitedBy, 
        token: token,
        status: "pending" 
      });
    
    if (dbError) console.error("Error inserting invite to DB:", dbError);

    // 3. Send custom email
    try {
      await sendInviteEmail(data.email, roleName, token, data.fullName);
    } catch (e) {
      console.error("Error sending custom email:", e);
    }

    return { success: true };
  });

export const resendInviteServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    email: z.string().email(),
    roleId: z.string().uuid().nullable(),
    fullName: z.string().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured on server");
    }

    const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get Role Name
    let roleName = "Membro";
    if (data.roleId) {
      const { data: roleData } = await adminClient
        .from("custom_roles")
        .select("name")
        .eq("id", data.roleId)
        .single();
      if (roleData) roleName = roleData.name;
    }

    // Generate a new link for resend
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: data.email,
      options: {
        redirectTo: "https://kasa-opus.lovable.app/convite"
      }
    });

    if (linkError) throw linkError;

    const inviteUrl = new URL(linkData.properties.action_link);
    const token = inviteUrl.searchParams.get("token");

    if (!token) throw new Error("Could not generate invitation token");

    // Update token in DB
    await adminClient
      .from("user_invites")
      .update({ token })
      .eq("email", data.email);

    await sendInviteEmail(data.email, roleName, token, data.fullName);

    return { success: true };
  });

export async function createInvite(email: string, roleId: string | null, fullName?: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("User not authenticated");

  return createInviteServer({
    data: {
      email,
      roleId,
      fullName,
      invitedBy: u.user.id
    }
  });
}

export async function resendInvite(email: string, roleId: string | null, fullName?: string) {
  return resendInviteServer({
    data: { email, roleId, fullName }
  });
}

// Added back dummy AppRole if needed for types, but using string in labels

