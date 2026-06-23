import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/dme-batch/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: batch, error } = await supabaseAdmin
          .from("dme_batches")
          .select("*, clients(id, name, company)")
          .eq("public_token", params.token)
          .maybeSingle();
        if (error || !batch) {
          return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
        }

        const { data: items } = await supabaseAdmin
          .from("dme_batch_items")
          .select(
            "extra_demand_id, extra_demands(id, number_display, title, description, value, due_date, status)",
          )
          .eq("batch_id", (batch as any).id);

        return Response.json({
          batch,
          dmes: (items ?? []).map((i: any) => i.extra_demands).filter(Boolean),
        });
      },

      POST: async ({ params, request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const body = await request.json().catch(() => ({}));
        const action: string = body?.action ?? "approve";

        if (action === "approve") {
          const signature: string = (body?.signature ?? "").toString().trim();
          if (!signature) {
            return new Response(JSON.stringify({ error: "signature_required" }), { status: 400 });
          }
          const { data, error } = await (supabaseAdmin.rpc as any)("approve_dme_batch", {
            p_token: params.token,
            p_signature: signature,
          });
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
          return Response.json({ ok: true, transaction_id: data });
        }

        if (action === "reject") {
          const reason: string = (body?.reason ?? "").toString().trim();
          if (!reason) {
            return new Response(JSON.stringify({ error: "reason_required" }), { status: 400 });
          }
          const { error } = await (supabaseAdmin.rpc as any)("reject_dme_batch", {
            p_token: params.token,
            p_reason: reason,
          });
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
          return Response.json({ ok: true });
        }

        return new Response(JSON.stringify({ error: "invalid_action" }), { status: 400 });
      },
    },
  },
});
