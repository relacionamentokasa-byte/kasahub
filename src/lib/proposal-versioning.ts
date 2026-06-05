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
  type: 'termination' | 'archiving', 
  reason: string
) {
  const { data: userData } = await supabase.auth.getUser();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("client_id, lead_id, generated_contract_id, generated_project_id")
    .eq("id", proposalId)
    .single();

  if (!proposal) throw new Error("Proposta não encontrada");

  // Update proposal
  await supabase
    .from("proposals")
    .update({
      status: 'cancelled',
      cancellation_type: type,
      cancellation_reason: reason,
      cancelled_by: userData.user?.id
    } as any)
    .eq("id", proposalId);

  if (type === 'termination') {
    // Encerrar contrato
    if (proposal.generated_contract_id) {
      await supabase.from("contracts").update({ status: 'cancelled' }).eq("id", proposal.generated_contract_id);
    }
    // Encerrar projeto
    if (proposal.generated_project_id) {
      await supabase.from("projects").update({ status: 'archived' }).eq("id", proposal.generated_project_id);
    }
    // Cancelar transações pendentes
    await supabase
      .from("transactions")
      .update({ status: 'cancelled' })
      .eq("proposal_id", proposalId)
      .eq("status", 'pending');
  } else {
    // Arquivamento
    if (proposal.generated_contract_id) {
      await supabase.from("contracts").update({ status: 'archived' as any }).eq("id", proposal.generated_contract_id);
    }
    if (proposal.generated_project_id) {
      await supabase.from("projects").update({ status: 'archived' }).eq("id", proposal.generated_project_id);
    }
  }

  await recordProposalEvent(proposalId, "cancelled", { type, reason });
  
  await recordTimelineEvent({
    client_id: proposal.client_id,
    lead_id: proposal.lead_id,
    type: type === 'termination' ? 'termination' : 'archived',
    title: type === 'termination' ? 'Contrato e operação encerrados' : 'Proposta e contrato arquivados',
    description: reason,
    metadata: { proposal_id: proposalId, cancellation_type: type }
  });
}
