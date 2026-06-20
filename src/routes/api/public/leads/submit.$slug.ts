import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const FormSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
  email: z.string().trim().email("E-mail inválido").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  budget: z.string().trim().max(80).optional().or(z.literal("")),
  utm_source: z.string().max(120).optional().or(z.literal("")),
  utm_medium: z.string().max(120).optional().or(z.literal("")),
  utm_campaign: z.string().max(120).optional().or(z.literal("")),
  utm_content: z.string().max(120).optional().or(z.literal("")),
  utm_term: z.string().max(120).optional().or(z.literal("")),
  referrer: z.string().max(500).optional().or(z.literal("")),
  landing_page_url: z.string().max(500).optional().or(z.literal("")),
});

export const Route = createFileRoute("/api/public/leads/submit/$slug")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request, params }) => {
        const cors = { "access-control-allow-origin": "*", "content-type": "application/json" };

        let body: any = {};
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400, headers: cors });
        }
        const parsed = FormSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "invalid_form", details: parsed.error.flatten() }),
            { status: 400, headers: cors },
          );
        }
        const d = parsed.data;
        if (!d.email && !d.phone) {
          return new Response(JSON.stringify({ error: "contact_required" }), { status: 400, headers: cors });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: source } = await supabaseAdmin
          .from("lead_sources")
          .select("id, is_active, landing_success_message, landing_redirect_url")
          .eq("slug", params.slug)
          .maybeSingle();
        if (!source || !source.is_active) {
          return new Response(JSON.stringify({ error: "source_not_found" }), { status: 404, headers: cors });
        }

        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null;
        const ua = request.headers.get("user-agent") || null;

        const { data: result, error } = await (supabaseAdmin.rpc as any)("fn_upsert_lead_from_source", {
          p_source_id: source.id,
          p_name: d.name,
          p_email: d.email || null,
          p_phone: d.phone || null,
          p_company: d.company || null,
          p_message: d.message || null,
          p_utm: {
            source: d.utm_source || null,
            medium: d.utm_medium || null,
            campaign: d.utm_campaign || null,
            content: d.utm_content || null,
            term: d.utm_term || null,
          },
          p_referrer: d.referrer || null,
          p_landing_url: d.landing_page_url || null,
          p_raw_payload: d as any,
          p_ip: ip,
          p_user_agent: ua,
        });

        if (error) {
          return new Response(
            JSON.stringify({ error: "processing_failed", details: error.message }),
            { status: 500, headers: cors },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            ...(result as any),
            success_message: source.landing_success_message,
            redirect_url: source.landing_redirect_url,
          }),
          { status: 200, headers: cors },
        );
      },
    },
  },
});
