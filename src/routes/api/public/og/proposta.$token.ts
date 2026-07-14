import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "workers-og";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const Route = createFileRoute("/api/public/og/proposta/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token;

        const { data: proposal } = await supabaseAdmin
          .from("proposals")
          .select("title, client_name, monthly_investment, one_time_investment, recurring_months, contract_type")
          .eq("public_token", token)
          .maybeSingle();

        const { data: agency } = await supabaseAdmin
          .from("agency_settings")
          .select("name, logo_proposals_url, logo_url")
          .limit(1)
          .maybeSingle();

        const agencyName = agency?.name || "Kasa Marketing & Consultoria";
        const clientName = proposal?.client_name || "";
        const title = proposal?.title || "Proposta Comercial";
        const monthly = proposal?.monthly_investment || 0;
        const setup = proposal?.one_time_investment || 0;
        const months = proposal?.recurring_months || 12;
        const setupOnly = monthly <= 0 && setup > 0;
        const highlight = setupOnly
          ? formatBRL(setup)
          : `${formatBRL(monthly)}/mês`;
        const highlightLabel = setupOnly ? "Investimento" : "Investimento mensal";
        const totalLabel = setupOnly
          ? "Pagamento único"
          : `Total ${months}m: ${formatBRL(monthly * months + setup)}`;

        const logo = agency?.logo_proposals_url || agency?.logo_url || "";

        const html = `
          <div style="height:100%;width:100%;display:flex;flex-direction:column;justify-content:space-between;padding:70px;background:linear-gradient(135deg,#0b0f1a 0%,#111827 50%,#1a1030 100%);color:#ffffff;font-family:sans-serif;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:16px;">
                ${logo ? `<img src="${logo}" style="height:56px;width:auto;" />` : ""}
                <span style="font-size:22px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">${agencyName}</span>
              </div>
              <div style="font-size:22px;color:#ffbc45;letter-spacing:3px;text-transform:uppercase;">Proposta Comercial</div>
            </div>

            <div style="display:flex;flex-direction:column;gap:20px;">
              ${clientName ? `<div style="font-size:28px;color:#94a3b8;">Para <span style="color:#fff;font-weight:700;">${clientName}</span></div>` : ""}
              <div style="font-size:64px;font-weight:800;line-height:1.05;max-width:1000px;">${title}</div>
            </div>

            <div style="display:flex;align-items:flex-end;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.15);padding-top:32px;">
              <div style="display:flex;flex-direction:column;">
                <span style="font-size:20px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">${highlightLabel}</span>
                <span style="font-size:68px;font-weight:800;color:#ffbc45;">${highlight}</span>
                <span style="font-size:20px;color:#cbd5e1;margin-top:4px;">${totalLabel}</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;">
                <span style="font-size:20px;color:#94a3b8;">Assine online</span>
                <span style="font-size:26px;color:#fff;font-weight:700;">kasahub.lovable.app</span>
              </div>
            </div>
          </div>
        `;

        return new ImageResponse(html, {
          width: 1200,
          height: 630,
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        });
      },
    },
  },
});
