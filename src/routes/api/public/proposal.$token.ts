import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { approveProposal } from "@/lib/proposal-approval";


export const Route = createFileRoute("/api/public/proposal/$token")({
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
        const { data: proposal, error } = await supabaseAdmin
          .from("proposals")
          .select("*")
          .eq("public_token", token)
          .maybeSingle();
        if (error || !proposal) {
          return new Response(JSON.stringify({ error: "not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { data: items } = await supabaseAdmin
          .from("proposal_items")
          .select("*")
          .eq("proposal_id", proposal.id)
          .order("order_index", { ascending: true });
        const { data: agency } = await supabaseAdmin
          .from("agency_settings")
          .select("name, logo_url, brand_primary, brand_secondary, email, phone, website, document, address")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        // Auto-mark as viewed
        if (proposal.status === "sent") {
          await supabaseAdmin
            .from("proposals")
            .update({ status: "viewed" })
            .eq("id", proposal.id);
          await supabaseAdmin.from("proposal_events").insert({
            proposal_id: proposal.id,
            type: "viewed",
          });
        }

        return new Response(
          JSON.stringify({ proposal, items: items ?? [], agency: agency ?? null }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        );
      },
      POST: async ({ params, request }) => {
        // Accept signature (assinatura digital simples)
        const token = params.token;
        const body = (await request.json().catch(() => ({}))) as {
          accepted_name?: string;
        };
        if (!body.accepted_name || body.accepted_name.length < 2 || body.accepted_name.length > 200) {
          return new Response(JSON.stringify({ error: "nome inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
        const { data: proposal } = await supabaseAdmin
          .from("proposals")
          .select("id")
          .eq("public_token", token)
          .maybeSingle();
        if (!proposal) {
          return new Response(JSON.stringify({ error: "not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          await approveProposal(supabaseAdmin, proposal.id, {
            acceptedName: body.accepted_name,
            acceptedIp: ip,
          });
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
