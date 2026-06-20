import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const PayloadSchema = z.record(z.string(), z.any());

function pick(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

export const Route = createFileRoute("/api/public/leads/inbound")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type, x-kasa-secret",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "access-control-allow-origin": "*",
          "content-type": "application/json",
        };
        const url = new URL(request.url);
        const slug = (url.searchParams.get("source") || "").trim();
        const secret =
          request.headers.get("x-kasa-secret") || url.searchParams.get("secret") || "";

        if (!slug) {
          return new Response(JSON.stringify({ error: "missing_source" }), { status: 400, headers: cors });
        }

        let body: any = {};
        try {
          const text = await request.text();
          if (text) {
            const ct = request.headers.get("content-type") || "";
            if (ct.includes("application/x-www-form-urlencoded")) {
              const params = new URLSearchParams(text);
              body = Object.fromEntries(params.entries());
            } else {
              body = JSON.parse(text);
            }
          }
        } catch {
          return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400, headers: cors });
        }
        const parsed = PayloadSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400, headers: cors });
        }
        const data = parsed.data as Record<string, any>;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: source } = await supabaseAdmin
          .from("lead_sources")
          .select("id, secret, is_active")
          .eq("slug", slug)
          .maybeSingle();

        if (!source || !source.is_active) {
          return new Response(JSON.stringify({ error: "source_not_found" }), { status: 404, headers: cors });
        }
        if (!secret || secret !== source.secret) {
          return new Response(JSON.stringify({ error: "invalid_secret" }), { status: 401, headers: cors });
        }

        const name = pick(data, ["name", "nome", "full_name", "fullname", "full name"]) || "Lead sem nome";
        const email = pick(data, ["email", "e-mail", "mail"]);
        const phone = pick(data, ["phone", "telefone", "whatsapp", "celular", "tel", "fone"]);
        const company = pick(data, ["company", "empresa", "organization"]);
        const message = pick(data, ["message", "mensagem", "comentario", "comment", "obs", "observacao"]);
        const referrer = pick(data, ["referrer", "referer", "referrer_url"]);
        const landingUrl = pick(data, ["landing_page_url", "landing_url", "page_url", "url"]);

        const utm = {
          source: pick(data, ["utm_source"]),
          medium: pick(data, ["utm_medium"]),
          campaign: pick(data, ["utm_campaign"]),
          content: pick(data, ["utm_content"]),
          term: pick(data, ["utm_term"]),
        };

        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null;
        const ua = request.headers.get("user-agent") || null;

        const { data: result, error } = await (supabaseAdmin.rpc as any)("fn_upsert_lead_from_source", {
          p_source_id: source.id,
          p_name: name,
          p_email: email,
          p_phone: phone,
          p_company: company,
          p_message: message,
          p_utm: utm,
          p_referrer: referrer,
          p_landing_url: landingUrl,
          p_raw_payload: data,
          p_ip: ip,
          p_user_agent: ua,
        });

        if (error) {
          await supabaseAdmin.from("lead_source_submissions").insert({
            source_id: source.id,
            payload: data,
            ip,
            user_agent: ua,
            status: "error",
            error_message: error.message,
          });
          return new Response(JSON.stringify({ error: "processing_failed", details: error.message }), {
            status: 500,
            headers: cors,
          });
        }

        return new Response(JSON.stringify({ ok: true, ...(result as any) }), { status: 200, headers: cors });
      },
    },
  },
});
