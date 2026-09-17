import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { UAParser } from "ua-parser-js";

const TokenSchema = z.string().min(8).max(200);

export const Route = createFileRoute("/api/public/proposta/$token/view")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const parsed = TokenSchema.safeParse(params.token);
          if (!parsed.success) {
            return Response.json({ error: "invalid token" }, { status: 400 });
          }
          const token = parsed.data;

          // Se a requisição contiver cabeçalho indicando que é da equipe interna/logado, não contabiliza
          const authHeader = request.headers.get("authorization") || request.headers.get("x-kasa-internal");
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const jwt = authHeader.replace("Bearer ", "").trim();
            const { data: userAuth } = await supabaseAdmin.auth.getUser(jwt);
            if (userAuth?.user) {
              return Response.json({ ignored: true, reason: "internal_team" });
            }
          }

          const { data: proposal } = await supabaseAdmin
            .from("proposals")
            .select("id, status, title")
            .eq("public_token", token)
            .maybeSingle();

          if (!proposal) {
            return Response.json({ error: "not_found" }, { status: 404 });
          }

          const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
          const userAgent = request.headers.get("user-agent") ?? "Desconhecido";
          const parser = new UAParser(userAgent);
          const uaResult = parser.getResult();

          // Registra apenas se a proposta estiver Enviada
          if (proposal.status === "Enviada" || proposal.status === "sent") {
            try {
              await supabaseAdmin.from("proposal_events").insert({
                proposal_id: proposal.id,
                type: "viewed",
                payload: {
                  ip,
                  browser: `${uaResult.browser.name ?? ""} ${uaResult.browser.version ?? ""}`.trim(),
                  device: uaResult.device.type || "desktop",
                  os: `${uaResult.os.name ?? ""} ${uaResult.os.version ?? ""}`.trim(),
                  viewed_at: new Date().toISOString(),
                },
              });
            } catch (err) {
              console.warn("[API Public Proposal View] Error inserting view event:", err);
            }
          }

          return Response.json({ ok: true });
        } catch (err) {
          console.error("[API Public Proposal View] Error:", err);
          return Response.json({ error: "internal server error" }, { status: 500 });
        }
      },
    },
  },
});
