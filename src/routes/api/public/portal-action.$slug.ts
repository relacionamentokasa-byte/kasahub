import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const SlugSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);

const BodySchema = z.object({
  job_id: z.string().uuid(),
  attachment_id: z.string().uuid().optional().nullable(),
  action: z.enum(["approve", "request_adjustment", "comment"]),
  feedback: z.string().max(4000).optional().nullable(),
});

export const Route = createFileRoute("/api/public/portal-action/$slug")({
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
          return Response.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
        }
        const { job_id, attachment_id, action, feedback } = parsed.data;

        if (action === "request_adjustment" && (!feedback || feedback.trim().length < 3)) {
          return Response.json({ error: "feedback_required" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Verify the slug matches a client AND the job belongs to that client AND is portal-visible.
        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("id, portal_enabled")
          .eq("portal_slug", slugParsed.data)
          .maybeSingle();
        if (!client) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }

        const { data: job } = await supabaseAdmin
          .from("jobs")
          .select("id, status, client_id, show_in_portal, title, main_responsible_id")
          .eq("id", job_id)
          .maybeSingle();
        if (!job || job.client_id !== client.id || !job.show_in_portal) {
          return Response.json({ error: "forbidden" }, { status: 403 });
        }

        const dbAction =
          action === "approve" ? "approved" : action === "request_adjustment" ? "adjustment_requested" : "comment";

        // 1) Insert log
        const { error: logErr } = await supabaseAdmin.from("job_approval_logs").insert({
          job_id,
          attachment_id: attachment_id ?? null,
          client_id: client.id,
          action: dbAction,
          feedback: feedback?.trim() || null,
          created_by: "cliente",
        });
        if (logErr) {
          return Response.json({ error: "db_error", message: logErr.message }, { status: 500 });
        }

        // 2) Update job status & feedback
        const update: {
          updated_at: string;
          status?: string;
          last_feedback?: string | null;
          feedback_at?: string;
        } = { updated_at: new Date().toISOString() };
        if (action === "approve") {
          update.status = "adjustments"; // 👤 Aguardando Cliente (próxima etapa)
        } else if (action === "request_adjustment") {
          update.status = "in_progress";
          update.last_feedback = feedback?.trim() || null;
          update.feedback_at = new Date().toISOString();
        }
        if (Object.keys(update).length > 1) {
          await supabaseAdmin.from("jobs").update(update).eq("id", job_id);
        }

        // 3) Notify responsible (best-effort; ignore failure)
        if (job.main_responsible_id) {
          try {
            await supabaseAdmin.from("notificacoes").insert({
              user_id: job.main_responsible_id,
              titulo:
                action === "approve"
                  ? "Cliente aprovou ✅"
                  : action === "request_adjustment"
                    ? "Pedido de ajuste 🔄"
                    : "Comentário do cliente 💬",
              mensagem:
                action === "approve"
                  ? `O cliente aprovou o job "${job.title}".`
                  : `Cliente em "${job.title}": ${feedback?.slice(0, 200) || ""}`,
              tipo: action === "request_adjustment" ? "warning" : "info",
              link: `/jobs?jobId=${job_id}`,
            });
          } catch {
            /* notification failure should not block the action */
          }
        }

        return Response.json(
          { ok: true },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
