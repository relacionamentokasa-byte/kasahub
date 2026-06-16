import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const SlugSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);

const BodySchema = z.object({
  item_id: z.string().uuid(),
  action: z.enum(["approve", "reject", "mark_viewed"]),
  feedback: z.string().max(4000).optional().nullable(),
});

export const Route = createFileRoute("/api/public/portal-approval-action/$slug")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const slugParsed = SlugSchema.safeParse(params.slug);
        if (!slugParsed.success) {
          return Response.json({ error: "invalid_slug" }, { status: 400 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        const { item_id, action, feedback } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("portal_slug", slugParsed.data)
          .maybeSingle();
        if (!client) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }

        const { data: item } = await (supabaseAdmin as any)
          .from("approval_items")
          .select("id, client_id, title, created_by")
          .eq("id", item_id)
          .maybeSingle();
        if (!item || item.client_id !== client.id) {
          return Response.json({ error: "forbidden" }, { status: 403 });
        }

        const now = new Date().toISOString();
        let patch: Record<string, unknown> = { updated_at: now };

        if (action === "approve") {
          patch.status = "approved";
          patch.approved_at = now;
          patch.rejected_at = null;
          if (feedback?.trim()) patch.feedback = feedback.trim();
        } else if (action === "reject") {
          patch.status = "rejected";
          patch.rejected_at = now;
          patch.approved_at = null;
          patch.feedback = feedback?.trim() || null;
        } else if (action === "mark_viewed") {
          patch.viewed_at = now;
        }

        const { error: upErr } = await (supabaseAdmin as any)
          .from("approval_items")
          .update(patch)
          .eq("id", item_id);
        if (upErr) {
          return Response.json({ error: "db_error", message: upErr.message }, { status: 500 });
        }

        // Notify creator (best-effort)
        if ((action === "approve" || action === "reject") && item.created_by) {
          try {
            await supabaseAdmin.from("notificacoes").insert({
              user_id: item.created_by,
              titulo: action === "approve" ? "Cliente aprovou ✅" : "Cliente recusou ❌",
              mensagem:
                action === "approve"
                  ? `Aprovado: "${item.title}"`
                  : `Recusado: "${item.title}"${feedback?.trim() ? ` — ${feedback.slice(0, 200)}` : ""}`,
              tipo: action === "reject" ? "warning" : "info",
              link: `/aprovacoes`,
            });
          } catch {
            /* ignore */
          }
        }

        return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
