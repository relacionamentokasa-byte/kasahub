import { supabase } from "@/integrations/supabase/client";

export type DmeBatch = {
  id: string;
  client_id: string;
  public_token: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  total_value: number;
  consolidated_transaction_id: string | null;
  due_date: string | null;
  signature_client: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
};

export async function createDmeBatch(input: {
  client_id: string;
  extra_demand_ids: string[];
  due_date?: string | null;
  notes?: string | null;
}) {
  if (!input.extra_demand_ids.length) throw new Error("Selecione ao menos uma DME.");

  const { data: dmes, error: dmesErr } = await supabase
    .from("extra_demands")
    .select("id, client_id, value, status")
    .in("id", input.extra_demand_ids);
  if (dmesErr) throw dmesErr;
  if (!dmes?.length) throw new Error("DMEs não encontradas.");

  const distinctClients = new Set(dmes.map((d) => d.client_id));
  if (distinctClients.size > 1) throw new Error("Todas as DMEs devem ser do mesmo cliente.");
  if (dmes.some((d) => !["draft", "pending", "sent", "pending_approval"].includes(d.status))) {
    throw new Error("Só é possível agrupar DMEs ainda não aprovadas/recusadas.");
  }

  const total = dmes.reduce((acc, d) => acc + Number(d.value || 0), 0);

  const { data: { user } } = await supabase.auth.getUser();
  const { data: batch, error: bErr } = await supabase
    .from("dme_batches" as any)
    .insert({
      client_id: input.client_id,
      total_value: total,
      due_date: input.due_date ?? null,
      notes: input.notes ?? null,
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (bErr) throw bErr;

  const items = input.extra_demand_ids.map((id) => ({
    batch_id: (batch as any).id,
    extra_demand_id: id,
  }));
  const { error: itemsErr } = await supabase.from("dme_batch_items" as any).insert(items);
  if (itemsErr) throw itemsErr;

  return batch as unknown as DmeBatch;
}

export function getDmeBatchPublicUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/dme-lote/${token}`;
}

export async function fetchBatchByToken(token: string) {
  const { data: batch, error } = await supabase
    .from("dme_batches" as any)
    .select("*, clients(id, name, company)")
    .eq("public_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!batch) return null;

  const { data: items, error: iErr } = await supabase
    .from("dme_batch_items" as any)
    .select("extra_demand_id, extra_demands(id, number_display, title, description, value, due_date, status)")
    .eq("batch_id", (batch as any).id);
  if (iErr) throw iErr;

  return {
    batch: batch as any,
    dmes: (items ?? []).map((i: any) => i.extra_demands).filter(Boolean),
  };
}

export async function approveBatch(token: string, signature: string) {
  const { data, error } = await supabase.rpc("approve_dme_batch" as any, {
    p_token: token,
    p_signature: signature,
  });
  if (error) throw error;
  return data;
}

export async function rejectBatch(token: string, reason: string) {
  const { error } = await supabase.rpc("reject_dme_batch" as any, {
    p_token: token,
    p_reason: reason,
  });
  if (error) throw error;
}

/**
 * Adiciona uma nova DME a um lote já consolidado no financeiro.
 * Cria a DME (já aprovada), vincula ao lote, recalcula o total do lote
 * e soma o valor na transação consolidada.
 */
export async function addDmeToConsolidatedBatch(input: {
  batch_id: string;
  title: string;
  description?: string | null;
  value: number;
  contract_id?: string | null;
  responsible_id?: string | null;
}) {
  if (!input.title.trim()) throw new Error("Informe o título da DME.");
  if (!input.value || input.value <= 0) throw new Error("Valor deve ser maior que zero.");

  const { data: batch, error: bErr } = await supabase
    .from("dme_batches" as any)
    .select("id, client_id, total_value, consolidated_transaction_id, status")
    .eq("id", input.batch_id)
    .maybeSingle();
  if (bErr) throw bErr;
  if (!batch) throw new Error("Lote não encontrado.");
  const b = batch as any;

  // 1. Cria a DME já aprovada (mesmo cliente do lote)
  const { data: dme, error: dErr } = await supabase
    .from("extra_demands")
    .insert({
      client_id: b.client_id,
      contract_id: input.contract_id ?? null,
      responsible_id: input.responsible_id ?? null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      value: input.value,
      status: "approved",
      approved_by_client: true,
      approved_at: new Date().toISOString(),
    } as any)
    .select()
    .single();
  if (dErr) throw dErr;
  const d = dme as any;

  // 2. Cancela a transação individual criada pelo trigger de aprovação
  await supabase
    .from("transactions")
    .update({ status: "cancelled" })
    .eq("extra_demand_id", d.id)
    .eq("status", "pending");

  // 3. Vincula ao lote
  const { error: itemErr } = await supabase
    .from("dme_batch_items" as any)
    .insert({ batch_id: b.id, extra_demand_id: d.id });
  if (itemErr) throw itemErr;

  // 4. Atualiza o total do lote
  const newTotal = Number(b.total_value || 0) + Number(input.value);
  await supabase
    .from("dme_batches" as any)
    .update({ total_value: newTotal })
    .eq("id", b.id);

  // 5. Soma na transação consolidada do financeiro
  if (b.consolidated_transaction_id) {
    const { data: tx } = await supabase
      .from("transactions")
      .select("amount, description, status")
      .eq("id", b.consolidated_transaction_id)
      .maybeSingle();
    if (tx && tx.status !== "paid" && tx.status !== "cancelled") {
      const newAmount = Number(tx.amount || 0) + Number(input.value);
      const addLine = `+ ${input.title.trim()} — R$ ${Number(input.value).toFixed(2).replace(".", ",")}`;
      await supabase
        .from("transactions")
        .update({
          amount: newAmount,
          description: `${tx.description || ""}\n${addLine}`.trim(),
        })
        .eq("id", b.consolidated_transaction_id);
    }
    // Vincula a DME nova à mesma transação consolidada
    await supabase
      .from("extra_demands")
      .update({ consolidated_transaction_id: b.consolidated_transaction_id })
      .eq("id", d.id);
  }

  return d;
}

export async function fetchBatchForDme(extra_demand_id: string) {
  const { data, error } = await supabase
    .from("dme_batch_items" as any)
    .select("batch_id, dme_batches(id, status, total_value, consolidated_transaction_id, client_id)")
    .eq("extra_demand_id", extra_demand_id)
    .maybeSingle();
  if (error) throw error;
  return (data as any)?.dme_batches ?? null;
}
