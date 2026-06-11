import { supabase } from "@/integrations/supabase/client";
import { fetchProposal, fetchProposalItems } from "./crm-api";
import { recordProposalEvent } from "./proposal-events";
import { recordTimelineEvent } from "./client-timeline";

export async function createProposalVersion(proposalId: string) {
  const original = await fetchProposal(proposalId);
  const items = await fetchProposalItems(proposalId);
  const { data: userData } = await supabase.auth.getUser();

  const nextVersion = (original.version || 1) + 1;
  const rootId = (original as any).root_proposal_id || original.id;

  const { data: created, error } = await supabase
    .from("proposals")
    .insert({
      title: `${original.title} (V${nextVersion})`,
      client_name: original.client_name,
      client_email: original.client_email,
      client_id: (original as any).client_id,
      lead_id: original.lead_id,
      intro: original.intro,
      monthly_investment: original.monthly_investment,
      one_time_investment: original.one_time_investment,
      total: original.total,
      currency: original.currency,
      valid_until: original.valid_until,
      status: "draft",
      owner_id: userData.user?.id ?? null,
      version: nextVersion,
      parent_id: original.id,
      root_proposal_id: rootId,
      responsible_id: (original as any).responsible_id,
      commercial_id: (original as any).commercial_id,

      contract_type: (original as any).contract_type,
      service_type: (original as any).service_type,
      service_ids: (original as any).service_ids,
      briefing: (original as any).briefing,
      payment_kind: (original as any).payment_kind,
      installments: (original as any).installments,
      first_due_date: (original as any).first_due_date,
      billing_day: (original as any).billing_day,
      account_id: (original as any).account_id,
      category_id: (original as any).category_id,
      auto_create_jobs: (original as any).auto_create_jobs,
      recurring_months: (original as any).recurring_months,
      scope: (original as any).scope,
      payment_method: (original as any).payment_method,
      contract_template_id: (original as any).contract_template_id,
      contract_content: (original as any).contract_content,
    } as any)
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

  await recordProposalEvent(created.id, "created", { version: nextVersion, parent_id: proposalId });
  
  await recordTimelineEvent({
    client_id: (original as any).client_id,
    lead_id: original.lead_id,
    type: 'proposal_created',
    title: `Nova versão da proposta criada (V${nextVersion})`,
    description: `Derivada da proposta original: ${original.title}`,
    metadata: { proposal_id: created.id, version: nextVersion }
  });

  return created;
}

export async function cancelProposalWorkflow(
  proposalId: string, 
  reason: string
) {
  console.log(`[Cancel Workflow] Iniciando cancelamento da proposta: ${proposalId}`);
  
  const { data: userData } = await supabase.auth.getUser();
  const { data: proposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("client_id, lead_id, generated_contract_id, generated_project_id, total, title")
    .eq("id", proposalId)
    .single();

  if (fetchErr || !proposal) {
    console.error(`[Cancel Workflow] Erro ao buscar proposta:`, fetchErr);
    throw new Error("Proposta não encontrada");
  }

  const contractId = proposal.generated_contract_id;
  const projectId = proposal.generated_project_id;
  
  console.log(`[Cancel Workflow] Contrato vinculado: ${contractId || 'Nenhum'}`);
  console.log(`[Cancel Workflow] Projeto vinculado: ${projectId || 'Nenhum'}`);

  // 1. Validações de segurança
  if (projectId) {
    // Verificar se há entregas concluídas
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, done_at")
      .eq("project_id", projectId);
    
    if (jobs?.some(j => j.done_at)) {
      console.warn(`[Cancel Workflow] Cancelamento abortado: existem tarefas concluídas.`);
      throw new Error("Não é possível remover esta estrutura porque já existem registros operacionais vinculados. Utilize a opção Encerrar Projeto.");
    }
  }


  // 2. Remoção de estruturas operacionais seguindo a ordem obrigatória
  try {
    if (projectId) {
      // 2.1 Solicitações, Tarefas e Entregas (Tudo na tabela 'jobs')
      const { data: jobsToDelete } = await supabase
        .from("jobs")
        .select("id, labels")
        .eq("project_id", projectId);
      
      const solicitacoesCount = jobsToDelete?.filter(j => Array.isArray(j.labels) && (j.labels as string[]).includes('solicitação')).length || 0;
      const entregasCount = jobsToDelete?.filter(j => Array.isArray(j.labels) && (j.labels as string[]).includes('entrega')).length || 0;
      const onboardingCount = jobsToDelete?.filter(j => Array.isArray(j.labels) && (j.labels as string[]).includes('onboarding')).length || 0;
      const tarefasCount = (jobsToDelete?.length || 0) - solicitacoesCount - entregasCount - onboardingCount;

      console.log(`[Cancel Workflow] Removendo ${jobsToDelete?.length || 0} registros de jobs (Solicitações: ${solicitacoesCount}, Entregas: ${entregasCount}, Onboarding: ${onboardingCount}, Tarefas: ${tarefasCount})`);

      // Deletar checklist e comentários antes de deletar os jobs (evitar órfãos)
      if (jobsToDelete?.length) {
        const jobIds = jobsToDelete.map(j => j.id);
        
        const { error: checklistErr } = await supabase.from("job_checklist").delete().in("job_id", jobIds);
        if (checklistErr) throw new Error(`Falha ao remover checklist das tarefas: ${checklistErr.message}`);
        
      }

      const { error: jobsErr } = await supabase.from("jobs").delete().eq("project_id", projectId);
      if (jobsErr) throw new Error(`Falha ao remover tarefas (jobs): ${jobsErr.message}`);

      // 2.2 Responsáveis vinculados
      const { error: membersErr } = await supabase.from("project_members").delete().eq("project_id", projectId);
      if (membersErr) throw new Error(`Falha ao remover responsáveis vinculados: ${membersErr.message}`);

      // 2.3 Projeto
      console.log(`[Cancel Workflow] Removendo projeto: ${projectId}`);
      const { error: projectErr } = await supabase.from("projects").delete().eq("id", projectId);
      if (projectErr) throw new Error(`Falha ao remover projeto: ${projectErr.message}`);
    }

    // 2.4 Contrato
    if (contractId) {
      console.log(`[Cancel Workflow] Removendo contrato: ${contractId}`);
      const { error: contractErr } = await supabase.from("contracts").delete().eq("id", contractId);
      if (contractErr) throw new Error(`Falha ao remover contrato: ${contractErr.message}`);
    }


    // 3. Atualizar status da proposta
    const { error: updateErr } = await supabase
      .from("proposals")
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_by: userData.user?.id,
        cancelled_at: new Date().toISOString(),
        structure_status: 'removed',
        generated_project_id: null,
        generated_contract_id: null
      } as any)
      .eq("id", proposalId);

    if (updateErr) throw new Error(`Falha ao atualizar status da proposta: ${updateErr.message}`);

    await recordProposalEvent(proposalId, "cancelled", { reason });
    await recordProposalEvent(proposalId, "structure_removed" as any, { reason });
    
    await recordTimelineEvent({
      client_id: proposal.client_id,
      lead_id: proposal.lead_id,
      type: 'termination',
      title: 'Proposta cancelada e estrutura removida',
      description: `Motivo: ${reason}`,
      metadata: { proposal_id: proposalId }
    });

    console.log(`[Cancel Workflow] Operação finalizada com sucesso para a proposta ${proposalId}`);
    
  } catch (err: any) {
    console.error(`[Cancel Workflow] Erro crítico durante cancelamento:`, err);
    throw err;
  }
}

export async function reopenProposal(proposalId: string) {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data: proposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("client_id, lead_id")
    .eq("id", proposalId)
    .single();
  
  if (fetchErr) throw fetchErr;

  const { data: updated, error } = await supabase
    .from("proposals")
    .update({
      status: 'draft',
      accepted_at: null,
      converted_at: null,
      structure_status: null
    } as any)
    .eq("id", proposalId)
    .select()
    .single();

  if (error) throw error;

  await recordProposalEvent(proposalId, "reopened");
  
  await recordTimelineEvent({
    client_id: proposal.client_id,
    lead_id: proposal.lead_id,
    type: 'operation',
    title: 'Proposta cancelada foi reaberta',
    description: 'Status alterado para Em Edição. Uma nova aprovação será necessária para gerar a estrutura.',
    metadata: { proposal_id: proposalId }
  });

  return updated;
}
