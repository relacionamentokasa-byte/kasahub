import { createFileRoute } from "@tanstack/react-router";

// Webhook do Banco Inter para notificação de pagamento de boletos.
// Inter envia POST com lista de cobranças atualizadas.
// Proteção: query param ?secret=... validado contra INTER_WEBHOOK_SECRET.

export const Route = createFileRoute("/api/public/webhooks/inter")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const secret = url.searchParams.get("secret");
          const expected = process.env.INTER_WEBHOOK_SECRET;
          if (!expected || secret !== expected) {
            return new Response("Unauthorized", { status: 401 });
          }

          const body = await request.json();
          const items: any[] = Array.isArray(body) ? body : body?.cobrancas ?? [body];

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          for (const it of items) {
            const codigo = it.codigoSolicitacao ?? it.codigo_solicitacao;
            if (!codigo) continue;

            const situacao = it.situacao ?? it.cobranca?.situacao;
            const pagoEm =
              it.dataHoraSituacao ?? it.dataHoraPagamento ?? null;

            const { data: row } = await supabaseAdmin
              .from("boletos_inter" as any)
              .select("id, transaction_id")
              .eq("codigo_solicitacao", codigo)
              .maybeSingle();

            if (!row) continue;

            await supabaseAdmin
              .from("boletos_inter" as any)
              .update({
                situacao: situacao ?? "RECEBIDO",
                pago_em: situacao === "RECEBIDO" ? (pagoEm ?? new Date().toISOString()) : null,
                raw: it,
              })
              .eq("id", (row as any).id);

            if (situacao === "RECEBIDO") {
              await supabaseAdmin
                .from("transactions")
                .update({
                  status: "paid",
                  payment_date: (pagoEm ?? new Date().toISOString()).slice(0, 10),
                })
                .eq("id", (row as any).transaction_id);
            }
          }

          return new Response("ok");
        } catch (e) {
          console.error("inter webhook error", e);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
