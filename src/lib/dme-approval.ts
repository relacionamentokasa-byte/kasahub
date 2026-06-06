import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export async function approveExtraDemand(sb: SB, id: string) {
  const { data: dme, error: fetchErr } = await sb
    .from("extra_demands")
    .select("*")
    .eq("id", id)
    .single();
    
  if (fetchErr || !dme) throw new Error("DME não encontrada");

  // 1. Update DME status
  const { data: updated, error: updErr } = await sb
    .from("extra_demands")
    .update({ 
      status: "approved", 
      approved_at: new Date().toISOString() 
    })
    .eq("id", id)
    .select()
    .single();
    
  if (updErr) throw updErr;

  // 2. Find a project related to the contract
  const { data: project } = await sb
    .from("projects")
    .select("id")
    .eq("contract_id", dme.contract_id)
    .limit(1)
    .maybeSingle();

  // 3. Create Job
  const { data: stages } = await sb
    .from("job_stages")
    .select("id")
    .order("order_index")
    .limit(1);
    
  await sb.from("jobs").insert({
    title: `${dme.number_display}: ${dme.title}`,
    description: dme.description,
    client_id: dme.client_id,
    project_id: project?.id || null,
    dme_id: dme.id,
    stage_id: stages?.[0]?.id,
    priority: "normal",
  });

  // 4. Create Financeiro if billable
  if (dme.is_billable) {
    const { data: contract } = await sb
      .from("contracts")
      .select("*")
      .eq("id", dme.contract_id)
      .single();
      
    await sb.from("transactions").insert({
      kind: "income",
      description: `Demanda Extra ${dme.number_display}: ${dme.title}`,
      amount: dme.value,
      due_date: new Date().toISOString().slice(0, 10), // Today
      status: "pending",
      client_id: dme.client_id,
      contract_id: dme.contract_id,
      dme_id: dme.id,
      account_id: (contract as any)?.account_id || null,
      category_id: (contract as any)?.category_id || null,
    });
  }

  return updated;
}
