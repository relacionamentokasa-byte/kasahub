import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/dme/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: dme, error } = await supabaseAdmin
          .from("extra_demands")
          .select("*, contracts(id, title), clients(id, name, company)")
          .eq("public_token", params.token)
          .maybeSingle();
        if (error || !dme) {
          return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
        }

        const { data: agency } = await supabaseAdmin
          .from("agency_settings")
          .select("name, email, phone, logo_url, logo_proposals_url, brand_primary, brand_secondary, document")
          .limit(1)
          .maybeSingle();

        return Response.json({ dme, agency });
      },

      POST: async ({ params, request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const body = await request.json().catch(() => ({}));
        const action: string = body?.action ?? "approve";
        const reason: string | undefined = body?.reason;

        const { data: dme, error } = await supabaseAdmin
          .from("extra_demands")
          .select("id, status")
          .eq("public_token", params.token)
          .maybeSingle();
        if (error || !dme) {
          return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
        }

        if (dme.status === "approved" || dme.status === "rejected") {
          return new Response(JSON.stringify({ error: "already_decided" }), { status: 409 });
        }

        const patch =
          action === "reject"
            ? { status: "rejected", rejection_reason: reason ?? null }
            : { status: "approved", approved_by_client: true };

        const { error: upErr } = await supabaseAdmin
          .from("extra_demands")
          .update(patch as any)
          .eq("id", dme.id);
        if (upErr) {
          return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
