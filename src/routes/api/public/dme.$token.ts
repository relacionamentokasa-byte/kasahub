import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { approveExtraDemand } from "@/lib/dme-approval";

export const Route = createFileRoute("/api/public/dme/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token;
        if (!token || token.length > 100) {
          return new Response(JSON.stringify({ error: "invalid token" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        const { data: dme, error } = await supabaseAdmin
          .from("extra_demands")
          .select(`
            *,
            clients (name, company, logo_url, brand_primary),
            contracts (title)
          `)
          .eq("public_token", token)
          .maybeSingle();

        if (error || !dme) {
          return new Response(JSON.stringify({ error: "not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: agency } = await supabaseAdmin
          .from("agency_settings")
          .select("name, logo_url, brand_primary, brand_secondary, email, phone, website, document, address")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        return new Response(
          JSON.stringify({ dme, agency: agency ?? null }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        );
      },
      POST: async ({ params }) => {
        const token = params.token;
        const { data: dme } = await supabaseAdmin
          .from("extra_demands")
          .select("id")
          .eq("public_token", token)
          .maybeSingle();

        if (!dme) {
          return new Response(JSON.stringify({ error: "not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          await approveExtraDemand(supabaseAdmin, dme.id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "erro ao aprovar";
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
