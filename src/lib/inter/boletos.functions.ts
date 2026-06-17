import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";

async function callEdge(action: string, payload: any) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/inter-api`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Edge inter-api ${res.status}`);
  return data;
}

function buildPagador(client: any) {
  const doc = (client.document ?? "").replace(/\D/g, "");
  if (!doc) throw new Error("Cliente sem CPF/CNPJ.");
  if (!client.zip_code) throw new Error("Cliente sem CEP.");
  if (!client.address || !client.address_number)
    throw new Error("Cliente sem endereço completo.");
  if (!client.city || !client.state)
    throw new Error("Cliente sem cidade/UF.");

  return {
    email: client.financial_contact_email || client.email || undefined,
    ddd: undefined,
    telefone: (client.financial_contact_phone || client.phone || "").replace(/\D/g, "") || undefined,
    numero: client.address_number,
    complemento: undefined,
    cpfCnpj: doc,
    tipoPessoa: doc.length === 11 ? "FISICA" : "JURIDICA",
    nome: client.name || client.company,
    endereco: client.address,
    bairro: client.neighborhood ?? undefined,
    cidade: client.city,
    uf: client.state,
    cep: client.zip_code.replace(/\D/g, ""),
  };
}

export const emitirBoletoInter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { transactionId: string; mensagem?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. busca transação + cliente
    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("*, clients(*)")
      .eq("id", data.transactionId)
      .single();
    if (txErr || !tx) throw new Error("Transação não encontrada.");
    if (tx.type !== "income") throw new Error("Boleto só pode ser emitido em receitas.");
    if (!tx.client_id || !tx.clients) throw new Error("Transação sem cliente vinculado.");

    // 2. já existe boleto ativo?
    const { data: existing } = await supabase
      .from("boletos_inter" as any)
      .select("id, situacao")
      .eq("transaction_id", data.transactionId)
      .not("situacao", "in", "(CANCELADO,EXPIRADO)")
      .maybeSingle();
    if (existing) throw new Error("Já existe boleto ativo para esta transação.");

    const seuNumero = `TX${String(tx.id).slice(0, 8).toUpperCase()}`;
    const payload = {
      seuNumero,
      valorNominal: Number(tx.amount),
      dataVencimento: tx.due_date,
      numDiasAgenda: 30,
      pagador: buildPagador(tx.clients),
      mensagem: data.mensagem
        ? { linha1: data.mensagem.slice(0, 78) }
        : undefined,
    };

    const result = await callEdge("emitir", payload);

    const det = result.detalhe ?? {};
    const boleto = det.boleto ?? {};
    const pix = det.pix ?? {};

    const { data: inserted, error: insErr } = await (supabase as any)
      .from("boletos_inter")
      .insert({
        transaction_id: tx.id,
        client_id: tx.client_id,
        codigo_solicitacao: result.codigoSolicitacao,
        seu_numero: seuNumero,
        nosso_numero: boleto.nossoNumero ?? null,
        situacao: det.situacao ?? "EM_PROCESSAMENTO",
        valor_nominal: Number(tx.amount),
        data_vencimento: tx.due_date,
        pdf_path: result.pdfPath,
        linha_digitavel: boleto.linhaDigitavel ?? null,
        codigo_barras: boleto.codigoBarras ?? null,
        pix_copia_cola: pix.pixCopiaECola ?? null,
        pix_txid: pix.txid ?? null,
        raw: det,
        owner_id: userId,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    // URL assinada do PDF (1h)
    const { data: signed } = await (supabase as any).storage
      .from("boletos")
      .createSignedUrl(result.pdfPath, 3600);

    return { boleto: inserted, pdfUrl: signed?.signedUrl ?? null };
  });

export const cancelarBoletoInter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { boletoId: string; motivo?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: b, error } = await (supabase as any)
      .from("boletos_inter")
      .select("*")
      .eq("id", data.boletoId)
      .single();
    if (error || !b) throw new Error("Boleto não encontrado.");

    await callEdge("cancelar", {
      codigoSolicitacao: b.codigo_solicitacao,
      motivo: data.motivo ?? "OUTROS",
    });

    await (supabase as any)
      .from("boletos_inter")
      .update({
        situacao: "CANCELADO",
        cancelado_em: new Date().toISOString(),
        motivo_cancelamento: data.motivo ?? null,
      })
      .eq("id", data.boletoId);

    return { ok: true };
  });

export const getBoletoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { boletoId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: b } = await (supabase as any)
      .from("boletos_inter")
      .select("pdf_path")
      .eq("id", data.boletoId)
      .single();
    if (!b?.pdf_path) throw new Error("PDF indisponível.");
    const { data: signed, error } = await (supabase as any).storage
      .from("boletos")
      .createSignedUrl(b.pdf_path, 3600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const pingInter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return await callEdge("ping", {});
  });

export const registrarWebhookInter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { webhookUrl: string }) => d)
  .handler(async ({ data }) => {
    return await callEdge("registrar-webhook", { webhookUrl: data.webhookUrl });
  });

export const listBoletosInter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("boletos_inter")
      .select("*, clients(name, company)")
      .order("emitido_em", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
