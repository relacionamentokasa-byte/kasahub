import { supabase } from "@/integrations/supabase/client";

export type CompanyPartner = {
  id: string;
  full_name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  distribution_type: "profit_share" | "pro_labore_only";
  share_percentage: number;
  pro_labore_amount: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PartnerAdvance = {
  id: string;
  partner_id: string;
  amount: number;
  advance_date: string;
  description: string | null;
  status: "open" | "partially_settled" | "settled" | "cancelled";
  settled_amount: number;
  transaction_id: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company_partners?: Pick<CompanyPartner, "id" | "full_name"> | null;
};

export async function fetchCompanyPartners() {
  const { data, error } = await supabase
    .from("company_partners" as any)
    .select("*")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return (data || []) as unknown as CompanyPartner[];
}

export async function fetchPartnerAdvances() {
  const { data, error } = await supabase
    .from("partner_advances" as any)
    .select("*, company_partners(id, full_name)")
    .order("advance_date", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as PartnerAdvance[];
}

export async function createPartnerAdvance(input: {
  partner_id: string;
  amount: number;
  advance_date: string;
  description?: string | null;
  conta_id: string;
  notes?: string | null;
}) {
  // Get partner name for description
  const { data: partner, error: pErr } = await supabase
    .from("company_partners" as any)
    .select("full_name")
    .eq("id", input.partner_id)
    .single();
  if (pErr) throw pErr;
  const partnerName = (partner as any).full_name as string;

  // 1) Create the expense transaction (immediately paid, debits cash)
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      type: "expense",
      kind: "expense",
      status: "paid",
      description: `Vale Sócio - ${partnerName}${input.description ? ` - ${input.description}` : ""}`,
      amount: input.amount,
      due_date: input.advance_date,
      payment_date: input.advance_date,
      category: "Vale Sócio",
      conta_id: input.conta_id,
      notes: input.notes ?? null,
      nature: "operacional",
    } as any)
    .select()
    .single();
  if (txErr) throw txErr;

  // 2) Create the advance record linked to the transaction
  const { data: { user } } = await supabase.auth.getUser();
  const { data: adv, error: advErr } = await supabase
    .from("partner_advances" as any)
    .insert({
      partner_id: input.partner_id,
      amount: input.amount,
      advance_date: input.advance_date,
      description: input.description ?? null,
      transaction_id: tx.id,
      created_by: user?.id ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (advErr) throw advErr;

  return adv as unknown as PartnerAdvance;
}

export async function cancelPartnerAdvance(id: string) {
  const { error } = await supabase
    .from("partner_advances" as any)
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}

export async function settlePartnerAdvance(id: string, settled_amount: number, total: number) {
  const status = settled_amount >= total ? "settled" : settled_amount > 0 ? "partially_settled" : "open";
  const { error } = await supabase
    .from("partner_advances" as any)
    .update({ settled_amount, status })
    .eq("id", id);
  if (error) throw error;
}
