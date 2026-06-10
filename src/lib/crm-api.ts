import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { recordTimelineEvent } from "./client-timeline";
import { handleMentions } from "./notifications-api";

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
  origin_partner_id?: string | null;
}) {
  const phone = input.phone?.replace(/\D/g, "");
  const formattedPhone = phone ? (phone.startsWith("55") ? `+${phone}` : `+55${phone}`) : null;
  
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...input, phone: formattedPhone, owner_id: userData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  
  await recordTimelineEvent({
    lead_id: data.id,
    type: 'lead_created',
    title: `Novo Lead criado: ${data.name}`,
    description: `Origem: ${data.source || 'Não informada'}`
  });

  return data;
}

export async function updateLead(
  id: string,
  patch: Partial<Database["public"]["Tables"]["leads"]["Update"]>,
) {
  const patchWithPhone = { ...patch };
  if (patch.phone) {
    const phone = patch.phone.replace(/\D/g, "");
    patchWithPhone.phone = phone.startsWith("55") ? `+${phone}` : `+55${phone}`;
  }

  const { data, error } = await supabase
    .from("leads")
    .update(patchWithPhone)
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

export async function deleteLeadStage(id: string) {
  // Check if stage has leads
  const { count } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage_id", id);
  if (count && count > 0) {
    throw new Error(`Não é possível excluir uma coluna que contém ${count} leads. Mova os leads para outra coluna primeiro.`);
  }
  const { error } = await supabase.from("lead_stages").delete().eq("id", id);
  if (error) throw error;
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
  const { data: lead } = await supabase.from('leads').select('name').eq('id', leadId).single();
  
  const { data, error } = await supabase
    .from("lead_activities")
    .insert({ lead_id: leadId, user_id: userData.user?.id ?? null, type, content })
    .select()
    .single();
  if (error) throw error;

  if (content.includes('@')) {
    await handleMentions(content, {
      title: `Atividade no Lead: ${lead?.name}`,
      link: `/crm`,
      originType: 'leads',
      originId: leadId
    });
  }

  return data;
}

export async function fetchProposals(includeDeleted = false): Promise<Proposal[]> {
  let query = supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }
  
  const { data, error } = await query;
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

export function sanitizeProposalPayload<T extends object>(input: T): T {
  const uuidFields = [
    'client_id', 'lead_id', 'responsible_id', 'commercial_id', 
    'account_id', 'category_id', 'contract_template_id', 'owner_id',
    'parent_id', 'root_proposal_id', 'generated_contract_id', 'generated_project_id',
    'cancelled_by', 'internal_approval_by'
  ];

  const dateFields = [
    'valid_until', 'first_due_date', 'sent_at', 'accepted_at', 
    'converted_at', 'signed_at', 'cancelled_at', 'deleted_at'
  ];

  const result = { ...input } as any;
  
  // Sanitize UUID fields: convert empty strings to null
  for (const field of uuidFields) {
    if (result[field] === "") {
      result[field] = null;
    }
  }

  // Sanitize Date fields: convert empty strings to null to avoid Postgres "invalid input syntax for type date"
  for (const field of dateFields) {
    if (result[field] === "") {
      result[field] = null;
    }
  }

  return result;
}

export async function createProposal(input: {
  title: string;
  client_name: string;
  client_email?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  intro?: string | null;
  target_kind?: "lead" | "client";
  service_ids?: string[];
  contract_type?: string;
  payment_kind?: string;
  valid_until?: string | null;
  monthly_investment?: number;
  one_time_investment?: number;
  total?: number;
  contract_term?: string;
  installments?: number;
  recurring_months?: number;
  payment_method?: string;
  first_due_date?: string;
  notes?: string | null;
  scope?: string[];
  scope_text?: string[] | string | null;
  auto_create_jobs?: boolean;
  contract_template_id?: string | null;
  contract_content?: string | null;
}) {
  const sanitizedInput = sanitizeProposalPayload(input);
  
  if (sanitizedInput.client_id) {
    const { data: client } = await supabase.from('clients').select('status').eq('id', sanitizedInput.client_id).single();
    if (client?.status === 'inactive') throw new Error("Não é possível criar propostas para clientes inativos.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("proposals")
    .insert({ ...sanitizedInput, owner_id: userData.user?.id ?? null } as any)
    .select()
    .single();
  if (error) throw error;

  await recordTimelineEvent({
    client_id: (data as any).client_id,
    lead_id: (data as any).lead_id,
    type: 'proposal_created',
    title: `Proposta comercial criada: ${data.title}`,
    description: `Valor total: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.total || 0)}`,
    metadata: { proposal_id: data.id }
  });

  return data;
}


export async function updateProposal(
  id: string,
  patch: Partial<Database["public"]["Tables"]["proposals"]["Update"]>,
) {
  const sanitizedPatch = sanitizeProposalPayload(patch);
  
  const { data, error } = await supabase
    .from("proposals")
    .update(sanitizedPatch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProposal(id: string, permanent = false) {
  if (permanent) {
    const { error } = await supabase.from("proposals").delete().eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("proposals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }
}

export async function restoreProposal(id: string) {
  const { error } = await supabase
    .from("proposals")
    .update({ deleted_at: null })
    .eq("id", id);
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
      client_id: (original as any).client_id,
      intro: original.intro,
      monthly_investment: original.monthly_investment,
      one_time_investment: original.one_time_investment,
      total: original.total,
      currency: original.currency,
      valid_until: original.valid_until,
      status: "draft",
      owner_id: userData.user?.id ?? null,
      scope_text: (original as any).scope_text,
      scope: original.scope,
      briefing: (original as any).briefing,
      contract_type: (original as any).contract_type,
      payment_kind: (original as any).payment_kind,
      recurring_months: (original as any).recurring_months,
      installments: (original as any).installments,
      billing_day: (original as any).billing_day,
      payment_method: (original as any).payment_method,
      contract_template_id: (original as any).contract_template_id,
      contract_content: (original as any).contract_content,
      responsible_id: (original as any).responsible_id,
      commercial_id: (original as any).commercial_id,
      account_id: (original as any).account_id,
      category_id: (original as any).category_id,
      notes: (original as any).notes,
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