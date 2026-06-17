// Supabase Edge Function: proxy autenticado para a API Cobrança v3 do Banco Inter.
// Roda em Deno e usa Deno.createHttpClient para suportar mTLS (cert + key PEM).
// Recebe chamadas internas (somente service_role) das server functions do app.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const INTER_BASE = "https://cdpj.partners.bancointer.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let cachedToken: { value: string; exp: number } | null = null;

function buildClient() {
  const cert = Deno.env.get("INTER_CERT_PEM");
  const key = Deno.env.get("INTER_KEY_PEM");
  if (!cert || !key) throw new Error("Certificado Inter não configurado.");
  // @ts-ignore Deno API
  return Deno.createHttpClient({ cert, key });
}

async function getToken(client: any): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 30_000) return cachedToken.value;

  const clientId = Deno.env.get("INTER_CLIENT_ID");
  const clientSecret = Deno.env.get("INTER_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Credenciais Inter ausentes.");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope:
      "boleto-cobranca.read boleto-cobranca.write webhook-cobranca.read webhook-cobranca.write",
  });

  const res = await fetch(`${INTER_BASE}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    // @ts-ignore Deno fetch option
    client,
  });

  if (!res.ok) {
    throw new Error(`OAuth Inter falhou: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    exp: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

async function interFetch(
  client: any,
  path: string,
  init: RequestInit & { json?: any } = {},
) {
  const token = await getToken(client);
  const conta = Deno.env.get("INTER_CONTA_CORRENTE");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(conta ? { "x-conta-corrente": conta } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const body =
    init.json !== undefined ? JSON.stringify(init.json) : (init.body as any);

  const res = await fetch(`${INTER_BASE}${path}`, {
    ...init,
    headers,
    body,
    // @ts-ignore Deno
    client,
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(
      `Inter ${path} ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
    );
  }
  return data;
}

async function downloadPdf(client: any, codigoSolicitacao: string): Promise<Uint8Array> {
  const token = await getToken(client);
  const conta = Deno.env.get("INTER_CONTA_CORRENTE");
  const res = await fetch(
    `${INTER_BASE}/cobranca/v3/cobrancas/${codigoSolicitacao}/pdf`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(conta ? { "x-conta-corrente": conta } : {}),
      },
      // @ts-ignore
      client,
    },
  );
  if (!res.ok) throw new Error(`PDF Inter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // resposta { pdf: "<base64>" }
  const b64 = data.pdf ?? data;
  const bin = atob(typeof b64 === "string" ? b64 : "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, payload } = await req.json();
    const client = buildClient();

    if (action === "emitir") {
      const created = await interFetch(client, "/cobranca/v3/cobrancas", {
        method: "POST",
        json: payload,
      });
      const codigo = created.codigoSolicitacao;
      // busca dados completos (linha digitável + pix)
      const detalhe = await interFetch(client, `/cobranca/v3/cobrancas/${codigo}`, {
        method: "GET",
      });
      const pdfBytes = await downloadPdf(client, codigo);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const pdfPath = `${codigo}.pdf`;
      await supabase.storage
        .from("boletos")
        .upload(pdfPath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      return new Response(
        JSON.stringify({ codigoSolicitacao: codigo, detalhe, pdfPath }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "consultar") {
      const data = await interFetch(
        client,
        `/cobranca/v3/cobrancas/${payload.codigoSolicitacao}`,
        { method: "GET" },
      );
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cancelar") {
      await interFetch(
        client,
        `/cobranca/v3/cobrancas/${payload.codigoSolicitacao}/cancelar`,
        { method: "POST", json: { motivoCancelamento: payload.motivo ?? "OUTROS" } },
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "registrar-webhook") {
      await interFetch(client, "/cobranca/v3/boletos/webhook", {
        method: "PUT",
        json: { webhookUrl: payload.webhookUrl },
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ping") {
      await getToken(client);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("inter-api error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
