import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateInput = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  email: z.string().email().max(320),
  role: z.string().max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  password: z.string().min(8).max(72),
  permissions: z.record(z.string(), z.boolean()).optional(),
  set_primary: z.boolean().optional(),
});

export const createPortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => CreateInput.parse(i))
  .handler(async ({ data, context }) => {
    // require team member
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const allowed = new Set(["admin", "ceo", "gestor", "operador"]);
    if (!roles?.some((r) => allowed.has(r.role as string))) {
      throw new Error("Sem permissão");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create or fetch auth user
    let authUserId: string | null = null;
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.name,
        display_name: data.name,
        portal_client_id: data.client_id,
      },
    });
    if (created.error) {
      // Already exists — try to find them
      const list = await supabaseAdmin.auth.admin.listUsers();
      const existing = list.data.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!existing) throw new Error(created.error.message);
      authUserId = existing.id;
      // Update password
      await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: data.password });
    } else {
      authUserId = created.data.user?.id ?? null;
    }

    const { data: row, error: insErr } = await supabaseAdmin
      .from("client_portal_users")
      .insert({
        client_id: data.client_id,
        auth_user_id: authUserId,
        name: data.name,
        email: data.email,
        role: data.role ?? null,
        phone: data.phone ?? null,
        permissions: data.permissions ?? {
          approvals: true, projects: true, jobs: true, calendar: true, files: true, reports: true,
        },
        status: "active",
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    if (data.set_primary && authUserId) {
      await supabaseAdmin.from("clients").update({ portal_user_id: authUserId }).eq("id", data.client_id);
    }

    return { ok: true, id: row.id };
  });

const ResetInput = z.object({ portal_user_id: z.string().uuid(), password: z.string().min(8).max(72) });
export const resetPortalUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ResetInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("client_portal_users")
      .select("auth_user_id")
      .eq("id", data.portal_user_id)
      .single();
    if (!row?.auth_user_id) throw new Error("Usuário sem conta vinculada");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(row.auth_user_id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteInput = z.object({ portal_user_id: z.string().uuid() });
export const deletePortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => DeleteInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("client_portal_users")
      .select("auth_user_id, client_id")
      .eq("id", data.portal_user_id)
      .single();
    await supabaseAdmin.from("client_portal_users").delete().eq("id", data.portal_user_id);
    if (row?.auth_user_id) {
      // Clear primary link if matched
      await supabaseAdmin
        .from("clients")
        .update({ portal_user_id: null })
        .eq("id", row.client_id)
        .eq("portal_user_id", row.auth_user_id);
      await supabaseAdmin.auth.admin.deleteUser(row.auth_user_id).catch(() => null);
    }
    return { ok: true };
  });
