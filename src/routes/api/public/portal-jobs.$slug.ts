import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const SlugSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);

export const Route = createFileRoute("/api/public/portal-jobs/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsed = SlugSchema.safeParse(params.slug);
        if (!parsed.success) {
          return Response.json({ error: "invalid_slug" }, { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: client, error: cErr } = await supabaseAdmin
          .from("clients")
          .select("id, name, company, logo_url, brand_primary, portal_cover_url, portal_enabled")
          .eq("portal_slug", parsed.data)
          .maybeSingle();

        if (cErr || !client) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }

        const { data: jobs, error: jErr } = await supabaseAdmin
          .from("jobs")
          .select("id, title, description, status, due_date, progress_percentage, updated_at, main_responsible_id, priority")
          .eq("client_id", client.id)
          .eq("show_in_portal", true)
          .order("updated_at", { ascending: false });

        if (jErr) {
          return Response.json({ error: "db_error" }, { status: 500 });
        }

        // Fetch responsible names
        const userIds = Array.from(new Set((jobs || []).map((j) => j.main_responsible_id).filter(Boolean))) as string[];
        let responsibles: Record<string, { name: string | null; avatar: string | null }> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, display_name, full_name, avatar_url")
            .in("id", userIds);
          (profiles || []).forEach((p) => {
            responsibles[p.id] = { name: p.display_name || p.full_name, avatar: p.avatar_url };
          });
        }

        // Fetch checklist (etapas de execução) for visible jobs
        const jobIds = (jobs || []).map((j) => j.id);
        const stages: Record<string, Array<{ id: string; content: string; done: boolean; order_index: number }>> = {};
        if (jobIds.length > 0) {
          const { data: items } = await supabaseAdmin
            .from("job_checklist")
            .select("id, job_id, content, done, order_index")
            .in("job_id", jobIds)
            .order("order_index", { ascending: true });
          (items || []).forEach((it: any) => {
            if (!stages[it.job_id]) stages[it.job_id] = [];
            stages[it.job_id].push({
              id: it.id,
              content: it.content,
              done: !!it.done,
              order_index: it.order_index ?? 0,
            });
          });
        }

        return new Response(
          JSON.stringify({ client, jobs: jobs || [], responsibles, stages }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          },
        );
      },
    },
  },
});
