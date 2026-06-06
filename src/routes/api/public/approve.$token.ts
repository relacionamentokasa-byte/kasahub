import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const TokenSchema = z.string().min(8).max(200);

const FeedbackSchema = z.object({
  status: z.enum(["done", "adjustments"]),
  feedback: z.string().max(4000).optional().default(""),
});

export const Route = createFileRoute("/api/public/approve/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsed = TokenSchema.safeParse(params.token);
        if (!parsed.success) {
          return Response.json({ error: "invalid token" }, { status: 400 });
        }
        const token = parsed.data;

        const { data: job, error } = await supabaseAdmin
          .from("jobs")
          .select(
            "id, title, description, status, briefing_objective, briefing_guidelines, custom_form_data, last_feedback, feedback_at, project_id, client_id",
          )
          .eq("approval_token", token)
          .maybeSingle();

        if (error) {
          console.error("[public/approve GET] db error", error);
          return Response.json({ error: "internal error" }, { status: 500 });
        }
        if (!job) return Response.json({ error: "not found" }, { status: 404 });

        const [{ data: client }, { data: project }, { data: attachments }] = await Promise.all([
          job.client_id
            ? supabaseAdmin
                .from("clients")
                .select("name, company")
                .eq("id", job.client_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          job.project_id
            ? supabaseAdmin
                .from("projects")
                .select("name")
                .eq("id", job.project_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabaseAdmin
            .from("job_attachments")
            .select("id, file_name, file_url, created_at")
            .eq("job_id", job.id)
            .order("created_at", { ascending: false }),
        ]);

        return Response.json(
          { job: { ...job, client, project, attachments: attachments ?? [] } },
          { headers: { "Cache-Control": "no-store" } },
        );
      },

      POST: async ({ params, request }) => {
        const parsedToken = TokenSchema.safeParse(params.token);
        if (!parsedToken.success) {
          return Response.json({ error: "invalid token" }, { status: 400 });
        }
        const token = parsedToken.data;

        let body: z.infer<typeof FeedbackSchema>;
        try {
          body = FeedbackSchema.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid body" }, { status: 400 });
        }

        const { data: job, error: findErr } = await supabaseAdmin
          .from("jobs")
          .select("id, status")
          .eq("approval_token", token)
          .maybeSingle();

        if (findErr) {
          console.error("[public/approve POST] lookup error", findErr);
          return Response.json({ error: "internal error" }, { status: 500 });
        }
        if (!job) return Response.json({ error: "not found" }, { status: 404 });

        const { error: updateErr } = await supabaseAdmin
          .from("jobs")
          .update({
            status: body.status,
            last_feedback: body.feedback,
            feedback_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        if (updateErr) {
          console.error("[public/approve POST] update error", updateErr);
          return Response.json({ error: "internal error" }, { status: 500 });
        }

        await supabaseAdmin.from("job_history").insert({
          job_id: job.id,
          action: "feedback_received",
          to_value: body.status,
          metadata: { feedback: body.feedback, source: "public_link" },
        });

        return Response.json({ ok: true });
      },
    },
  },
});
