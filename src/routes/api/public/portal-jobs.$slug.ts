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
          .select("id, name, company, logo_url, brand_primary, portal_cover_url, portal_primary_color, portal_cover_color, portal_enabled, created_at")
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

        // Fetch attachments for visible jobs (signed URLs from private bucket)
        const attachments: Record<string, Array<{ id: string; file_name: string; file_url: string; file_type: string | null; category: string | null; created_at: string }>> = {};
        if (jobIds.length > 0) {
          const { data: attRows } = await supabaseAdmin
            .from("job_attachments")
            .select("id, job_id, file_name, file_url, file_type, category, created_at")
            .in("job_id", jobIds)
            .order("created_at", { ascending: false });

          for (const att of attRows || []) {
            let signedUrl: string = att.file_url;
            try {
              const parts = (att.file_url || "").split("/job-attachments/");
              if (parts.length >= 2) {
                const path = parts[1];
                if (!path.includes("..") && !path.startsWith("/")) {
                  const { data: signed } = await supabaseAdmin.storage
                    .from("job-attachments")
                    .createSignedUrl(path, 3600);
                  if (signed?.signedUrl) signedUrl = signed.signedUrl;
                }
              }
            } catch {
              /* keep raw URL */
            }
            if (!attachments[att.job_id]) attachments[att.job_id] = [];
            attachments[att.job_id].push({
              id: att.id,
              file_name: att.file_name,
              file_url: signedUrl,
              file_type: att.file_type,
              category: att.category,
              created_at: att.created_at,
            });
          }
        }

        // Fetch approval logs for visible jobs
        const approvals: Record<string, Array<{ id: string; action: string; feedback: string | null; created_at: string; attachment_id: string | null }>> = {};
        if (jobIds.length > 0) {
          const { data: logs } = await supabaseAdmin
            .from("job_approval_logs")
            .select("id, job_id, action, feedback, created_at, attachment_id")
            .in("job_id", jobIds)
            .order("created_at", { ascending: false });
          (logs || []).forEach((l: any) => {
            if (!approvals[l.job_id]) approvals[l.job_id] = [];
            approvals[l.job_id].push({
              id: l.id,
              action: l.action,
              feedback: l.feedback,
              created_at: l.created_at,
              attachment_id: l.attachment_id,
            });
          });
        }

        // Fetch invoices (transações de receita do cliente)
        const { data: txRows } = await supabaseAdmin
          .from("transactions")
          .select("id, description, amount, due_date, payment_date, status, kind, type, payment_method, created_at")
          .eq("client_id", client.id)
          .or("kind.eq.income,type.eq.income")
          .order("due_date", { ascending: true });

        const invoices = (txRows || []).map((t: any) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount) || 0,
          due_date: t.due_date,
          payment_date: t.payment_date,
          status: t.status,
          payment_method: t.payment_method,
          created_at: t.created_at,
        }));

        // Fetch proposals (aprovadas/aceitas) do cliente
        const { data: propRows } = await supabaseAdmin
          .from("proposals")
          .select("id, title, total, monthly_investment, status, created_at, accepted_at, public_token, number_display, intro, scope_text, contract_content, recurring_months")
          .eq("client_id", client.id)
          .is("deleted_at", null)
          .in("status", ["accepted", "signed", "converted", "Aprovada", "aprovada"])
          .order("created_at", { ascending: false });

        const proposals = (propRows || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          total: Number(p.total) || 0,
          monthly_investment: Number(p.monthly_investment) || 0,
          status: p.status,
          created_at: p.created_at,
          accepted_at: p.accepted_at,
          public_token: p.public_token,
          number_display: p.number_display,
          intro: p.intro,
          scope_text: p.scope_text,
          contract_content: p.contract_content,
          recurring_months: p.recurring_months,
        }));

        // Fetch current contract (vigente)
        const today = new Date().toISOString().slice(0, 10);
        const { data: contractRows } = await supabaseAdmin
          .from("contracts")
          .select("id, title, total_value, monthly_value, start_date, end_date, status, payment_method, proposal_id, type, billing_day")
          .eq("client_id", client.id)
          .neq("status", "cancelled")
          .or(`end_date.is.null,end_date.gte.${today}`)
          .order("start_date", { ascending: false })
          .limit(1);

        let currentContract: any = null;
        if (contractRows && contractRows[0]) {
          const c: any = contractRows[0];
          if (c.proposal_id) {
            const { data: prop } = await supabaseAdmin
              .from("proposals")
              .select("contract_content, public_token, number_display")
              .eq("id", c.proposal_id)
              .maybeSingle();
            currentContract = {
              ...c,
              contract_content: prop?.contract_content || null,
              public_token: prop?.public_token || null,
              number_display: prop?.number_display || null,
            };
          } else {
            currentContract = { ...c, contract_content: null, public_token: null, number_display: null };
          }
        }

        // Fetch approval_items (Feed estilo Instagram)
        const { data: itemRows } = await (supabaseAdmin as any)
          .from("approval_items")
          .select("id, title, description, content_type, content_url, content_text, caption, thumbnail_url, status, feedback, sent_for_approval_at, viewed_at, approved_at, rejected_at, created_at, job_id, project_id, format, slides, slide_statuses")
          .eq("client_id", client.id)
          .neq("status", "archived")
          .order("created_at", { ascending: false });
        const approvalItems = (itemRows || []) as Array<Record<string, unknown>>;

        // Fetch comments for those items
        const itemIds = approvalItems.map((i) => i.id as string);
        const approvalComments: Record<string, Array<Record<string, unknown>>> = {};
        if (itemIds.length > 0) {
          const { data: cRows } = await (supabaseAdmin as any)
            .from("approval_item_comments")
            .select("id, approval_item_id, slide_id, author_type, author_name, body, is_change_request, created_at")
            .in("approval_item_id", itemIds)
            .order("created_at", { ascending: true });
          (cRows || []).forEach((c: any) => {
            if (!approvalComments[c.approval_item_id]) approvalComments[c.approval_item_id] = [];
            approvalComments[c.approval_item_id].push(c);
          });
        }

        // Fetch upcoming calendar events (próximos 60 dias)
        const nowIso = new Date().toISOString();
        const horizon = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
        const { data: evRows } = await supabaseAdmin
          .from("calendar_events")
          .select("id, title, description, kind, starts_at, ends_at, all_day, color")
          .eq("client_id", client.id)
          .gte("starts_at", nowIso)
          .lte("starts_at", horizon)
          .order("starts_at", { ascending: true })
          .limit(20);
        const events = evRows || [];

        return new Response(
          JSON.stringify({ client, jobs: jobs || [], responsibles, stages, attachments, approvals, invoices, proposals, currentContract, approvalItems, events }),

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

