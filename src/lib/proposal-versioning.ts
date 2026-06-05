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
      operational_id: (original as any).operational_id,
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
  const { data: userData } = await supabase.auth.getUser();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("client_id, lead_id, generated_contract_id, generated_project_id, total, title")
    .eq("id", proposalId)
    .single();

  if (!proposal) throw new Error("Proposta não encontrada");

  // 1. Validações de segurança
  // Verificar se há entregas concluídas
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, done_at")
    .eq("project_id", proposal.generated_project_id || "");
  
  if (jobs?.some(j => j.done_at)) {
    throw new Error("Não é possível remover esta estrutura porque já existem registros operacionais vinculados (tarefas concluídas). Utilize a opção Encerrar Projeto.");
  }

  // Verificar se há faturas pagas
  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, status")
    .eq("proposal_id", proposalId);
  
  if (transactions?.some(t => t.status === 'paid')) {
    throw new Error("Não é possível remover esta estrutura porque já existem registros financeiros vinculados (faturas pagas). Utilize a opção Encerrar Projeto.");
  }

  // 2. Remoção de estruturas operacionais
  // Remover Jobs
  if (proposal.generated_project_id) {
    await supabase.from("jobs").delete().eq("project_id", proposal.generated_project_id);
  }

  // Remover Projeto
  if (proposal.generated_project_id) {
    await supabase.from("projects").delete().eq("id", proposal.generated_project_id);
  }

  // Remover Contrato
  if (proposal.generated_contract_id) {
    await supabase.from("contracts").delete().eq("id", proposal.generated_contract_id);
  }

  // Cancelar transações pendentes
  await supabase
    .from("transactions")
    .update({ status: 'cancelled' })
    .eq("proposal_id", proposalId)
    .eq("status", 'pending');

  // 3. Atualizar status da proposta
  await supabase
    .from("proposals")
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_by: userData.user?.id,
      structure_status: 'removed'
    } as any)
    .eq("id", proposalId);

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
