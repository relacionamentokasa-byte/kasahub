import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const SlugSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);

const BodySchema = z.object({
  item_id: z.string().uuid(),
  action: z.enum([
    "approve",
    "reject",
    "mark_viewed",
    "approve_slide",
    "reject_slide",
    "comment",
  ]),
  feedback: z.string().max(4000).optional().nullable(),
  slide_id: z.string().max(100).optional().nullable(),
  comment: z.string().max(4000).optional().nullable(),
  author_name: z.string().max(120).optional().nullable(),
});

function recomputeAggregate(
  slides: Array<{ id: string }>,
  slideStatuses: Record<string, string>,
): { status: "pending" | "approved" | "rejected"; approved_at: string | null; rejected_at: string | null } {
  if (!slides?.length) return { status: "pending", approved_at: null, rejected_at: null };
  const now = new Date().toISOString();
  const statuses = slides.map((s) => slideStatuses[s.id] || "pending");
  const anyRejected = statuses.some((s) => s === "rejected");
  const allApproved = statuses.every((s) => s === "approved");
  if (anyRejected) return { status: "rejected", approved_at: null, rejected_at: now };
  if (allApproved) return { status: "approved", approved_at: now, rejected_at: null };
  return { status: "pending", approved_at: null, rejected_at: null };
}

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
        const { item_id, action, feedback, slide_id, comment, author_name } = parsed.data;

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
          .select("id, client_id, title, created_by, format, slides, slide_statuses")
          .eq("id", item_id)
          .maybeSingle();
        if (!item || item.client_id !== client.id) {
          return Response.json({ error: "forbidden" }, { status: 403 });
        }

        const now = new Date().toISOString();

        // --- COMMENT ---
        if (action === "comment") {
          if (!comment || !comment.trim()) {
            return Response.json({ error: "empty_comment" }, { status: 400 });
          }
          const { error: cErr } = await (supabaseAdmin as any)
            .from("approval_item_comments")
            .insert({
              approval_item_id: item_id,
              slide_id: slide_id ?? null,
              author_type: "client",
              author_name: author_name?.trim() || "Cliente",
              body: comment.trim(),
              is_change_request: false,
            });
          if (cErr) return Response.json({ error: "db_error", message: cErr.message }, { status: 500 });

          // Notify creator
          if (item.created_by) {
            try {
              await supabaseAdmin.from("notificacoes").insert({
                user_id: item.created_by,
                titulo: "💬 Novo comentário do cliente",
                mensagem: `"${item.title}"${slide_id ? ` (slide)` : ""}: ${comment.slice(0, 200)}`,
                tipo: "info",
                link: `/aprovacoes`,
              });
            } catch {/* ignore */}
          }
          return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
        }

        // --- PER-SLIDE APPROVAL ---
        if (action === "approve_slide" || action === "reject_slide") {
          if (!slide_id) return Response.json({ error: "missing_slide_id" }, { status: 400 });
          const slides: Array<{ id: string }> = Array.isArray(item.slides) ? item.slides : [];
          if (!slides.find((s) => s.id === slide_id)) {
            return Response.json({ error: "invalid_slide" }, { status: 400 });
          }
          const currentStatuses: Record<string, string> = item.slide_statuses ?? {};
          const nextStatuses = {
            ...currentStatuses,
            [slide_id]: action === "approve_slide" ? "approved" : "rejected",
          };
          const agg = recomputeAggregate(slides, nextStatuses);

          const patch: Record<string, unknown> = {
            slide_statuses: nextStatuses,
            status: agg.status,
            approved_at: agg.approved_at,
            rejected_at: agg.rejected_at,
            updated_at: now,
          };
          if (action === "reject_slide" && feedback?.trim()) {
            patch.feedback = feedback.trim();
          }

          const { error: upErr } = await (supabaseAdmin as any)
            .from("approval_items")
            .update(patch)
            .eq("id", item_id);
          if (upErr) return Response.json({ error: "db_error", message: upErr.message }, { status: 500 });

          // If feedback came along with reject_slide, store as comment too
          if (action === "reject_slide" && feedback?.trim()) {
            try {
              await (supabaseAdmin as any).from("approval_item_comments").insert({
                approval_item_id: item_id,
                slide_id,
                author_type: "client",
                author_name: author_name?.trim() || "Cliente",
                body: feedback.trim(),
                is_change_request: true,
              });
            } catch {/* ignore */}
          }

          // Notify creator on transitions
          if (item.created_by) {
            try {
              await supabaseAdmin.from("notificacoes").insert({
                user_id: item.created_by,
                titulo:
                  action === "approve_slide"
                    ? "Cliente aprovou um slide ✅"
                    : "Cliente pediu ajuste em um slide ✏️",
                mensagem: `"${item.title}"${feedback?.trim() ? ` — ${feedback.slice(0, 200)}` : ""}`,
                tipo: action === "reject_slide" ? "warning" : "info",
                link: `/aprovacoes`,
              });
            } catch {/* ignore */}
          }

          return Response.json({ ok: true, status: agg.status }, { headers: { "Cache-Control": "no-store" } });
        }

        // --- WHOLE-ITEM ACTIONS (legacy / single) ---
        let patch: Record<string, unknown> = { updated_at: now };
        if (action === "approve") {
          patch.status = "approved";
          patch.approved_at = now;
          patch.rejected_at = null;
          if (feedback?.trim()) patch.feedback = feedback.trim();
          // Also flip all slide statuses to approved for consistency
          if (item.format !== "single" && Array.isArray(item.slides)) {
            patch.slide_statuses = Object.fromEntries(
              (item.slides as Array<{ id: string }>).map((s) => [s.id, "approved"]),
            );
          }
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
          } catch {/* ignore */}
        }

        return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
