import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Stage = Database["public"]["Tables"]["lead_stages"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadActivity = Database["public"]["Tables"]["lead_activities"]["Row"];
export type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
export type ProposalItem = Database["public"]["Tables"]["proposal_items"]["Row"];

export async function fetchStages(): Promise<Stage[]> {
  const { data, error } = await supabase
    .from("lead_stages")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLead(input: {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  value?: number;
  source?: string | null;
  stage_id: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...input, owner_id: userData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLead(
  id: string,
  patch: Partial<Database["public"]["Tables"]["leads"]["Update"]>,
) {
  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLead(id: string) {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

export async function moveLead(id: string, stage_id: string, extras: { won_at?: string | null } = {}) {
  return updateLead(id, { stage_id, ...extras });
}

export async function fetchActivities(leadId: string): Promise<LeadActivity[]> {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addActivity(leadId: string, type: string, content: string) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("lead_activities")
    .insert({ lead_id: leadId, user_id: userData.user?.id ?? null, type, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProposal(id: string) {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchProposalItems(proposalId: string): Promise<ProposalItem[]> {
  const { data, error } = await supabase
    .from("proposal_items")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createProposal(input: {
  title: string;
  client_name: string;
  client_email?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  intro?: string | null;
  target_kind?: "lead" | "client";
  service_type?: string | null;
  contract_type?: string;
  valid_until?: string | null;
  commercial_id?: string | null;
  operational_id?: string | null;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("proposals")
    .insert({ ...input, owner_id: userData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}


export async function updateProposal(
  id: string,
  patch: Partial<Database["public"]["Tables"]["proposals"]["Update"]>,
) {
  const { data, error } = await supabase
    .from("proposals")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProposal(id: string) {
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateProposal(id: string): Promise<Proposal> {
  const original = await fetchProposal(id);
  const items = await fetchProposalItems(id);
  const { data: userData } = await supabase.auth.getUser();
  const { data: created, error } = await supabase
    .from("proposals")
    .insert({
      title: `${original.title} (cópia)`,
      client_name: original.client_name,
      client_email: original.client_email,
      lead_id: original.lead_id,
      intro: original.intro,
      monthly_investment: original.monthly_investment,
      one_time_investment: original.one_time_investment,
      total: original.total,
      currency: original.currency,
      valid_until: original.valid_until,
      status: "draft",
      owner_id: userData.user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  if (items.length) {
    const { error: itemsErr } = await supabase.from("proposal_items").insert(
      items.map((it) => ({
        proposal_id: created.id,
        title: it.title,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        recurrence: it.recurrence,
        order_index: it.order_index,
      })),
    );
    if (itemsErr) throw itemsErr;
  }
  return created;
}

export async function upsertProposalItem(
  item: Partial<ProposalItem> & { proposal_id: string; title: string },
) {
  if (item.id) {
    const { data, error } = await supabase
      .from("proposal_items")
      .update(item)
      .eq("id", item.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("proposal_items")
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProposalItem(id: string) {
  const { error } = await supabase.from("proposal_items").delete().eq("id", id);
  if (error) throw error;
}

export function recalcProposalTotals(items: ProposalItem[]) {
  let monthly = 0;
  let one_time = 0;
  for (const it of items) {
    const sub = Number(it.quantity) * Number(it.unit_price);
    if (it.recurrence === "monthly") monthly += sub;
    else one_time += sub;
  }
  return { monthly_investment: monthly, one_time_investment: one_time, total: monthly + one_time };
}

export function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}
