import { createFileRoute } from "@tanstack/react-router";

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const Route = createFileRoute("/api/public/og/proposta/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const token = params.token;

        const { data: proposal } = await supabaseAdmin
          .from("proposals")
          .select("title, client_name, monthly_investment, one_time_investment, recurring_months, contract_type")
          .eq("public_token", token)
          .maybeSingle();

        const { data: agency } = await supabaseAdmin
          .from("agency_settings")
          .select("name")
          .limit(1)
          .maybeSingle();

        const agencyName = agency?.name || "Kasa Marketing & Consultoria";
        const clientName = proposal?.client_name || "";
        const title = (proposal?.title || "Proposta Comercial").slice(0, 60);
        const monthly = proposal?.monthly_investment || 0;
        const setup = proposal?.one_time_investment || 0;
        const months = proposal?.recurring_months || 12;
        const setupOnly = monthly <= 0 && setup > 0;
        const highlight = setupOnly ? formatBRL(setup) : `${formatBRL(monthly)}/mês`;
        const highlightLabel = setupOnly ? "Investimento" : "Investimento mensal";
        const totalLabel = setupOnly
          ? "Pagamento único"
          : `Total ${months}m: ${formatBRL(monthly * months + setup)}`;

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0f1a"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#1a1030"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="70" y="90" font-family="Arial, sans-serif" font-size="22" fill="#94a3b8" letter-spacing="2">${escapeXml(agencyName.toUpperCase())}</text>
  <text x="1130" y="90" text-anchor="end" font-family="Arial, sans-serif" font-size="22" fill="#ffbc45" letter-spacing="3">PROPOSTA COMERCIAL</text>
  ${clientName ? `<text x="70" y="270" font-family="Arial, sans-serif" font-size="28" fill="#94a3b8">Para <tspan fill="#ffffff" font-weight="700">${escapeXml(clientName)}</tspan></text>` : ""}
  <text x="70" y="345" font-family="Arial, sans-serif" font-size="56" font-weight="800" fill="#ffffff">${escapeXml(title)}</text>
  <line x1="70" y1="490" x2="1130" y2="490" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <text x="70" y="525" font-family="Arial, sans-serif" font-size="20" fill="#94a3b8" letter-spacing="2">${escapeXml(highlightLabel.toUpperCase())}</text>
  <text x="70" y="585" font-family="Arial, sans-serif" font-size="60" font-weight="800" fill="#ffbc45">${escapeXml(highlight)}</text>
  <text x="1130" y="525" text-anchor="end" font-family="Arial, sans-serif" font-size="20" fill="#94a3b8">Assine online</text>
  <text x="1130" y="560" text-anchor="end" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">kasahub.lovable.app</text>
  <text x="1130" y="590" text-anchor="end" font-family="Arial, sans-serif" font-size="18" fill="#cbd5e1">${escapeXml(totalLabel)}</text>
</svg>`;

        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        });
      },
    },
  },
});
