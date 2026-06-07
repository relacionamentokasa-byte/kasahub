import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { handleMentions } from "./notifications-api";

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
  let project = null;
  if (dme.contract_id) {
    const { data: p } = await sb
      .from("projects")
      .select("id, owner_id")
      .eq("contract_id", dme.contract_id)
      .limit(1)
      .maybeSingle();
    project = p;
  }

  // 3. Create Job
  const { data: stages } = await sb
    .from("job_stages")
    .select("id")
    .order("order_index")
    .limit(1);
    
  if (!project?.id) throw new Error("Não foi possível encontrar um projeto vinculado a este contrato para gerar o job.");
  if (!dme.contract_id) throw new Error("Esta DME não possui um contrato vinculado.");

  // Forçar vinculação obrigatória (excluir qualquer dúvida de nulabilidade para o TS)
  const contractId: string = dme.contract_id;
  const clientId: string = dme.client_id;
  const projectId: string = project.id;
  const stageId: string | null = stages?.[0]?.id || null;

  // Precisamos de um serviço genérico para DMEs se não houver um vinculado
  // Para manter a integridade, buscamos o primeiro serviço ativo ou um fixo
  const { data: service } = await sb.from("services").select("id").eq("is_active", true).limit(1).maybeSingle();
  if (!service) throw new Error("Não há serviços cadastrados no sistema para vincular ao job da DME.");

  await sb.from("jobs").insert({
    title: `${dme.number_display}: ${dme.title}`,
    description: dme.description,
    client_id: clientId,
    project_id: projectId,
    contract_id: contractId,
    service_id: service.id, // Vínculo obrigatório adicionado
    dme_id: dme.id,
    stage_id: stageId,
    priority: "normal",
    main_responsible_id: (project as any)?.owner_id || null,
  });

  // 4. Create Financeiro if billable
  if (dme.is_billable) {
    let account_id = null;
    let category_id = null;

    if (dme.contract_id) {
      const { data: contract } = await sb
        .from("contracts")
        .select("*")
        .eq("id", dme.contract_id)
        .single();
      
      account_id = (contract as any)?.account_id || null;
      category_id = (contract as any)?.category_id || null;
    }
      
    await sb.from("transactions").insert({
      kind: "income",
      description: `Demanda Extra ${dme.number_display}: ${dme.title}`,
      amount: dme.value,
      due_date: new Date().toISOString().slice(0, 10), // Today
      status: "pending",
      client_id: dme.client_id,
      contract_id: dme.contract_id,
      dme_id: dme.id,
      account_id,
      category_id,
    });
  }

  const { data: userData } = await sb.auth.getUser();
  await sb.rpc('notify_user', {
    p_user_id: (project as any)?.owner_id || userData.user?.id,
    p_title: "DME Aprovada",
    p_description: `A demanda ${dme.number_display} foi aprovada e gerou um Job.`,
    p_category: 'approval',
    p_origin_type: 'extra_demands',
    p_origin_id: dme.id,
    p_link: '/jobs'
  } as any);

  if (dme.description?.includes('@')) {
    await handleMentions(dme.description, {
      title: `DME: ${dme.title}`,
      link: `/propostas`,
      originType: 'extra_demands',
      originId: dme.id
    });
  }

  return updated;
}
