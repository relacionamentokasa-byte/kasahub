import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { approveProposal } from "@/lib/proposal-approval";
import { z } from "zod";

const TokenSchema = z.string().min(8).max(200);

const SignSchema = z.object({
  accepted_name: z.string().trim().min(2).max(200),
  accepted_cpf: z.string().trim().min(11).max(20).optional().default(""),
  accepted_terms: z.literal(true),
});

export const Route = createFileRoute("/api/public/proposal/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsed = TokenSchema.safeParse(params.token);
        if (!parsed.success) {
          return Response.json({ error: "invalid token" }, { status: 400 });
        }
        const token = parsed.data;

        const { data: proposal, error } = await supabaseAdmin
          .from("proposals")
          .select("*")
          .eq("public_token", token)
          .maybeSingle();
        if (error || !proposal) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }

        const [{ data: items }, { data: agency }, { data: client }] = await Promise.all([
          supabaseAdmin
            .from("proposal_items")
            .select("*")
            .eq("proposal_id", proposal.id)
            .order("order_index", { ascending: true }),
          supabaseAdmin
            .from("agency_settings")
            .select(
              "name, logo_url, brand_primary, brand_secondary, email, phone, website, document, address, agency_signature_url",
            )
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          proposal.client_id
            ? supabaseAdmin
                .from("clients")
                .select("name, company, email, phone, document")
                .eq("id", proposal.client_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        // Auto-mark as viewed
        if (proposal.status === "sent") {
          await supabaseAdmin
            .from("proposals")
            .update({ status: "viewed" })
            .eq("id", proposal.id);
          await supabaseAdmin
            .from("proposal_events")
            .insert({ proposal_id: proposal.id, type: "viewed" });
        }

        return new Response(
          JSON.stringify({
            proposal,
            items: items ?? [],
            agency: agency ?? null,
            client: client ?? null,
          }),
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
        const parsed = TokenSchema.safeParse(params.token);
        if (!parsed.success) {
          return Response.json({ error: "invalid token" }, { status: 400 });
        }
        const token = parsed.data;

        let body: z.infer<typeof SignSchema>;
        try {
          body = SignSchema.parse(await request.json());
        } catch {
          return Response.json(
            { error: "Preencha nome, CPF e aceite os termos" },
            { status: 400 },
          );
        }

        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;

        const { data: proposal } = await supabaseAdmin
          .from("proposals")
          .select("id, status")
          .eq("public_token", token)
          .maybeSingle();

        if (!proposal) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }
        if (proposal.status === "cancelled") {
          return Response.json({ error: "cancelled" }, { status: 409 });
        }
        if (proposal.status === "accepted") {
          return Response.json({ error: "already_accepted" }, { status: 409 });
        }

        const signatureLine = body.accepted_cpf
          ? `${body.accepted_name} — CPF ${body.accepted_cpf}`
          : body.accepted_name;

        await supabaseAdmin
          .from("proposals")
          .update({
            signature_client: signatureLine,
            signed_at_client: new Date().toISOString(),
          })
          .eq("id", proposal.id);

        try {
          await approveProposal(supabaseAdmin, proposal.id, {
            acceptedName: body.accepted_name,
            acceptedIp: ip,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "erro ao aprovar";
          return Response.json({ error: msg }, { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
