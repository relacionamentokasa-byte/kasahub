import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { approveProposal } from "@/lib/proposal-approval";
import { z } from "zod";

const TokenSchema = z.string().min(8).max(200);

const SignSchema = z.object({
  accepted_name: z.string().trim().min(2).max(200),
  accepted_cpf: z.string().trim().min(11).max(20),
  accepted_role: z.string().trim().min(2).max(100),
  accepted_email: z.string().trim().email(),
  signature_data: z.string().min(100), // Base64 image
  accepted_terms: z.literal(true),
  accepted_representation: z.literal(true),
});

export const Route = createFileRoute("/api/public/proposal/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
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
            
          if (error) {
            console.error("[API Public Proposal] DB Error:", error);
            throw error;
          }
          
          if (!proposal) {
            return Response.json({ error: "not_found" }, { status: 404 });
          }

          // Fallback: if proposal has no contract_content, load the first available template
          if (!proposal.contract_content) {
            const { data: tpl } = await supabaseAdmin
              .from("contract_templates")
              .select("content")
              .is("archived_at", null)
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (tpl?.content) {
              (proposal as { contract_content?: string | null }).contract_content = tpl.content;
            }
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
                "name, logo_url, logo_proposals_url, brand_primary, brand_secondary, email, phone, website, document, address, agency_signature_url",
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
        } catch (err) {
          console.error("[API Public Proposal] Catastrophic Error:", err);
          return Response.json({ error: "internal server error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
        }
      },

      POST: async ({ params, request }) => {
        try {
          const parsed = TokenSchema.safeParse(params.token);
          if (!parsed.success) {
            return Response.json({ error: "invalid token" }, { status: 400 });
          }
          const token = parsed.data;

          let body: z.infer<typeof SignSchema>;
          try {
            body = SignSchema.parse(await request.json());
          } catch (e) {
            console.error("[API Public Proposal POST] Validation Error:", e);
            return Response.json(
              { error: "Preencha todos os campos obrigatórios, desenhe sua assinatura e aceite os termos." },
              { status: 400 },
            );
          }

          const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
          const userAgent = request.headers.get("user-agent") ?? "Desconhecido";

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

          const signatureLine = `${body.accepted_name} — CPF ${body.accepted_cpf} (${body.accepted_role})`;

          await supabaseAdmin
            .from("proposals")
            .update({
              signature_client: signatureLine,
              signed_at_client: new Date().toISOString(),
              accepted_user_agent: userAgent,
              accepted_ip: ip,
              client_cpf: body.accepted_cpf,
              client_role: body.accepted_role,
              client_signed_email: body.accepted_email,
              client_signature_data: body.signature_data,
              signed_metadata: {
                ip,
                user_agent: userAgent,
                timestamp: new Date().toISOString(),
                email: body.accepted_email,
                role: body.accepted_role
              }
            })
            .eq("id", proposal.id);

          await approveProposal(supabaseAdmin, proposal.id, {
            acceptedName: body.accepted_name,
            acceptedIp: ip,
          });

          return Response.json({ ok: true });
        } catch (err) {
          console.error("[API Public Proposal POST] Catastrophic Error:", err);
          return Response.json({ error: "internal server error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
        }
      },
    },
  },
});
