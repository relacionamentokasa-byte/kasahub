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

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.data);

        let query = supabaseAdmin
          .from("clients")
          .select("id, name, company, logo_url, brand_primary, brand_secondary, portal_cover_url, portal_primary_color, portal_cover_color, portal_enabled, has_launch_grid, created_at, portal_slug");

        if (isUuid) {
          query = query.or(`portal_slug.eq.${parsed.data},id.eq.${parsed.data}`);
        } else {
          query = query.eq("portal_slug", parsed.data);
        }

        let { data: client, error: cErr } = await query.maybeSingle();

        if (!client) {
          const { data: byName } = await supabaseAdmin
            .from("clients")
            .select("id, name, company, logo_url, brand_primary, brand_secondary, portal_cover_url, portal_primary_color, portal_cover_color, portal_enabled, has_launch_grid, created_at, portal_slug")
            .or(`portal_slug.ilike.${parsed.data},name.ilike.%${parsed.data}%,company.ilike.%${parsed.data}%`)
            .maybeSingle();
          if (byName) {
            client = byName;
          }
        }

        if (cErr || !client) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }

        const isClientUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(client.id);

        let jobs: any[] = [];
        let approvalItems: any[] = [];
        let events: any[] = [];

        if (isClientUuid) {
          const [jobsRes, approvalsRes, eventsRes] = await Promise.all([
            supabaseAdmin
              .from("jobs")
              .select("id, title, description, status, stage_id, due_date, progress_percentage, completed_steps, total_steps, done_at, updated_at, main_responsible_id, priority, launch_product_id")
              .eq("client_id", client.id)
              .eq("show_in_portal", true)
              .order("updated_at", { ascending: false }),

            (supabaseAdmin as any)
              .from("approval_items")
              .select("id, title, description, content_type, content_url, content_text, caption, thumbnail_url, status, feedback, sent_for_approval_at, viewed_at, approved_at, rejected_at, created_at, job_id, format, slides, slide_statuses")
              .eq("client_id", client.id)
              .neq("status", "archived")
              .order("created_at", { ascending: false }),

            supabaseAdmin
              .from("calendar_events")
              .select("id, title, starts_at, ends_at, kind, description")
              .eq("client_id", client.id)
              .gte("starts_at", new Date().toISOString())
              .order("starts_at", { ascending: true })
              .limit(10),
          ]);

          jobs = jobsRes.data || [];
          approvalItems = approvalsRes.data || [];
          events = eventsRes.data || [];
        }

        return new Response(
          JSON.stringify({ client, jobs, approvalItems, events }),
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
