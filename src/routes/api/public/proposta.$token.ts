import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { approveProposal } from "@/lib/proposal-approval";
import { z } from "zod";
import { UAParser } from "ua-parser-js";

const TokenSchema = z.string().min(8).max(200);

const SignSchema = z.object({
  accepted_name: z.string().min(2).max(200),
  accepted_cpf: z.string().min(11).max(20),
  accepted_role: z.string().min(2).max(100),
  accepted_email: z.string().email(),
  signature_data: z.string().min(100), // Base64 image
  accepted_terms: z.literal(true),
  accepted_representation: z.literal(true),
});

export const Route = createFileRoute("/api/public/proposta/$token")({
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

          const [{ data: items }, { data: agency }, { data: client }, { data: lead }] = await Promise.all([
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
                  .select("name, company, email, phone, document, address, logo_url")
                  .eq("id", proposal.client_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            proposal.lead_id
              ? supabaseAdmin
                  .from("leads")
                  .select("name, company, phone, email")
                  .eq("id", proposal.lead_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          // Auto-mark as viewed using a status accepted by the database constraint.
          if (proposal.status === "Enviada" || proposal.status === "sent") {
            await supabaseAdmin
              .from("proposals")
              .update({ status: "Enviada" })
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
              lead: lead ?? null,
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
          const parser = new UAParser(userAgent);
          const uaResult = parser.getResult();

          const { data: proposal } = await supabaseAdmin
            .from("proposals")
            .select("id, status, title, owner_id, responsible_id")
            .eq("public_token", token)
            .maybeSingle();

          if (!proposal) {
            return Response.json({ error: "not_found" }, { status: 404 });
          }
          if (proposal.status === "Cancelada" || proposal.status === "cancelled") {
            return Response.json({ error: "cancelled" }, { status: 409 });
          }
          if (
            proposal.status === "Aprovada" ||
            proposal.status === "accepted" ||
            proposal.status === "signed" ||
            proposal.status === "converted"
          ) {
            return Response.json({ error: "already_accepted" }, { status: 409 });
          }

          const signatureLine = `${body.accepted_name} — CPF ${body.accepted_cpf} (${body.accepted_role})`;
          const nowIso = new Date().toISOString();

          // 1. Atualiza a proposta para "Aprovada" e grava todos os dados da assinatura
          const { error: updErr } = await supabaseAdmin
            .from("proposals")
            .update({
              status: "Aprovada",
              accepted_at: nowIso,
              accepted_name: body.accepted_name,
              signature_client: signatureLine,
              signed_at_client: nowIso,
              accepted_user_agent: userAgent,
              accepted_ip: ip,
              client_cpf: body.accepted_cpf,
              client_role: body.accepted_role,
              client_signed_email: body.accepted_email,
              client_signature_data: body.signature_data,
              signed_metadata: {
                ip,
                user_agent: userAgent,
                browser: `${uaResult.browser.name} ${uaResult.browser.version}`,
                device: uaResult.device.type || "desktop",
                os: `${uaResult.os.name} ${uaResult.os.version}`,
                timestamp: nowIso,
                email: body.accepted_email,
                role: body.accepted_role,
              },
            })
            .eq("id", proposal.id);
          if (updErr) throw updErr;

          await supabaseAdmin.from("proposal_events").insert({
            proposal_id: proposal.id,
            type: "signed",
            actor_name: body.accepted_name,
            payload: {
              ip,
              browser: `${uaResult.browser.name} ${uaResult.browser.version}`,
              device: uaResult.device.type || "desktop",
              os: `${uaResult.os.name} ${uaResult.os.version}`,
              email: body.accepted_email,
              role: body.accepted_role,
            },
          });

          // 2 + 3. Cria cliente (se necessário), contrato, projeto, jobs e lançamentos financeiros
          try {
            await approveProposal(supabaseAdmin, proposal.id, {
              acceptedName: body.accepted_name,
              acceptedIp: ip,
            });
          } catch (approvalErr) {
            console.error("[API Public Proposal POST] Erro ao gerar projeto/financeiro:", approvalErr);
            // Não falha a assinatura — a proposta já está aprovada; agência pode regerar manualmente
          }

          // 4. Notifica a agência (owner + responsável + admins) que a proposta foi assinada
          try {
            const recipients = new Set<string>();
            if (proposal.owner_id) recipients.add(proposal.owner_id);
            if (proposal.responsible_id) recipients.add(proposal.responsible_id);

            const { data: admins } = await supabaseAdmin
              .from("user_roles")
              .select("user_id")
              .in("role", ["admin", "ceo", "gestor"]);
            for (const a of admins ?? []) {
              if (a.user_id) recipients.add(a.user_id);
            }

            if (recipients.size > 0) {
              const titulo = "Proposta assinada";
              const mensagem = `${body.accepted_name} assinou a proposta "${proposal.title}" pelo link público. Status: Aprovada.`;
              const link = `/propostas/${proposal.id}`;
              await supabaseAdmin.from("notificacoes").insert(
                Array.from(recipients).map((user_id) => ({
                  user_id,
                  titulo,
                  mensagem,
                  tipo: "success",
                  link,
                  lido: false,
                })),
              );
            }
          } catch (notifyErr) {
            console.error("[API Public Proposal POST] Erro ao notificar agência:", notifyErr);
          }


          return Response.json({ ok: true });
        } catch (err) {
          console.error("[API Public Proposal POST] Catastrophic Error:", err);
          return Response.json({ error: "internal server error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
        }
      },
    },
  },
});
