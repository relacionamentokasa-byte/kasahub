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
