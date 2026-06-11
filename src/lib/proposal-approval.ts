import type { SupabaseClient } from "@supabase/supabase-js";
// import { JOB_TEMPLATES } from "./job-templates"; // removed
import { recordProposalEventAdmin } from "./proposal-events";
import { recordTimelineEvent } from "./client-timeline";

import { fetchJobStages } from "./ops-api";

type SB = SupabaseClient;

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setMonth(r.getMonth() + n);
  return r;
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function safeBillingDay(year: number, month0: number, day: number): Date {
  // clamp to last day of month
  const last = new Date(year, month0 + 1, 0).getDate();
  return new Date(year, month0, Math.min(day, last));
}

export type ApproveContext = {
  acceptedName?: string | null;
  acceptedIp?: string | null;
  internalApproval?: boolean;
  internalApprovalBy?: string | null;
};

export type ApproveResult = {
  client_id: string;
  project_id: string;
  contract_id: string | null;
  jobs_created: number;
  transactions_created: number;
  created_at: string;
};

export async function approveProposal(
  sb: SB,
  proposalId: string,
  ctx: ApproveContext = {},
): Promise<ApproveResult> {
  // 1. Load proposal + items
  const { data: proposal, error: pErr } = await sb
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();
  if (pErr || !proposal) throw new Error(pErr?.message ?? "Proposta não encontrada");

  const { data: items, error: iErr } = await sb
    .from("proposal_items")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("order_index", { ascending: true });
  if (iErr) throw iErr;

  // 2. Step 1: Upsert de Cliente (Verificar/Criar)
  let clientId: string | null = proposal.client_id ?? null;
  if (!clientId) {
    const clientName = proposal.client_name?.trim() || "Cliente";
    const clientEmail = proposal.client_email?.trim()?.toLowerCase();

    // Check if client exists by email (preferred) or name
    let query = sb.from("clients").select("id").limit(1);
    if (clientEmail) {
      query = query.or(`email.ilike.${clientEmail},company.ilike.${clientName},name.ilike.${clientName}`);
    } else {
      query = query.or(`company.ilike.${clientName},name.ilike.${clientName}`);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing?.id) {
      clientId = existing.id;
    } else {
      const { data: created, error: cErr } = await sb
        .from("clients")
        .insert({
          name: clientName,
          company: clientName,
          email: clientEmail || null,
          owner_id: proposal.owner_id ?? null,
          status: 'active'
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      clientId = created.id;
    }
  }

  // 3. Step 2: Atualização do Status da Proposta
  const proposalUpdate: Record<string, any> = {
    status: "Aprovada",
    accepted_at: new Date().toISOString(),
    converted_at: new Date().toISOString(),
    client_id: clientId,
  };

  if (ctx.acceptedName) proposalUpdate.accepted_name = ctx.acceptedName;
  if (ctx.acceptedIp) proposalUpdate.accepted_ip = ctx.acceptedIp;
  if (ctx.internalApproval) {
    proposalUpdate.internal_approval = true;
    proposalUpdate.internal_approval_by = ctx.internalApprovalBy;
    proposalUpdate.internal_approval_at = new Date().toISOString();
  }

  // 4. Step 3: Criação Automática do Job (Projeto)
  // Check if contract exists or create it
  let contractId: string | null = proposal.generated_contract_id ?? null;
  const monthly = Number(proposal.monthly_investment ?? 0);
  const totalValue = Number(proposal.total ?? proposal.one_time_investment ?? 0);
  
  // Source of truth for número de parcelas: recurring_months (3, 6 ou 12 vindo da UI de pílulas).
  // Fallback para contract_term legado, e por último 12.
  let installmentsCount = Number(proposal.recurring_months || 0);
  if (!installmentsCount) {
    if (proposal.contract_term === "monthly") installmentsCount = 1;
    else if (proposal.contract_term?.includes("_months")) installmentsCount = Number(proposal.contract_term.replace("_months", ""));
  }
  if (!installmentsCount && Number(proposal.monthly_investment || 0) > 0) {
    installmentsCount = 12;
  }

  const contractData = {
    title: proposal.title,
    client_id: clientId,
    proposal_id: proposal.id,
    monthly_value: monthly,
    total_value: totalValue,
    billing_day: proposal.billing_day ?? 5,
    start_date: proposal.first_due_date ?? ymd(new Date()),
    status: "active",
    owner_id: proposal.owner_id ?? null,
    partner_id: (proposal as any).commercial_id || null, 
    type: proposal.contract_type || (monthly > 0 ? "recurring" : "one_time"),
    service_ids: proposal.service_ids ?? [],
    installments_count: installmentsCount,
  };

  if (contractId) {
    await sb.from("contracts").update(contractData).eq("id", contractId);
  } else {
    const { data: createdContract, error: ctErr } = await sb
      .from("contracts")
      .insert(contractData)
      .select("id")
      .single();
    if (ctErr) throw ctErr;
    contractId = createdContract.id;
  }

  // Create Project (Job)
  let projectId: string | null = proposal.generated_project_id ?? null;
  if (!projectId) {
    const { data: createdProject, error: prjErr } = await sb
      .from("projects")
      .insert({
        name: proposal.title,
        client_id: clientId,
        proposal_id: proposal.id,
        contract_id: contractId,
        briefing: proposal.briefing ?? proposal.intro ?? null,
        owner_id: proposal.responsible_id ?? proposal.owner_id ?? null,
        responsible_id: proposal.responsible_id ?? proposal.owner_id ?? null,
        status: "active",
        type: "automatic"
      })
      .select("id")
      .single();
    if (prjErr) throw prjErr;
    projectId = createdProject.id;
  }

  proposalUpdate.generated_project_id = projectId;
  proposalUpdate.generated_contract_id = contractId;

  // 5. Step 4: Geração Automática do Financeiro (Receita Prevista)
  // A primeira parcela cai exatamente na "Data do 1º Vencimento" e as demais
  // são incrementadas em +1 mês mantendo o mesmo dia (clamp para o último dia do mês).
  let txCreated = 0;
  const firstDueRaw = proposal.first_due_date ?? ymd(new Date());
  // Parse YYYY-MM-DD sem conversão de timezone
  const [fy, fm, fd] = firstDueRaw.split("-").map(Number);
  const dayOfMonth = fd;
  const baseYear = fy;
  const baseMonth0 = fm - 1;

  const transactions: any[] = [];

  // A. Geração das parcelas mensais (Recorrência) — gera EXATAMENTE installmentsCount lançamentos
  const monthlyAmount = Number(proposal.monthly_investment || 0);
  if (monthlyAmount > 0 && installmentsCount > 0) {
    for (let i = 0; i < installmentsCount; i++) {
      const due = safeBillingDay(baseYear, baseMonth0 + i, dayOfMonth);
      transactions.push({
        kind: "income",
        description: `Mensalidade ${proposal.title} (${i + 1}/${installmentsCount})`,
        amount: monthlyAmount,
        due_date: ymd(due),
        status: "pending",
        kind: "income",
        type: "income",
        account_id: proposal.account_id ?? null,
        category_id: proposal.category_id ?? null,
        client_id: clientId,
        project_id: projectId,
        proposal_id: proposal.id,
        contract_id: contractId,
        owner_id: proposal.owner_id ?? null,
      });
    }
  }

  // B. Geração do Setup (Investimento Único)
  const setupAmount = Number(proposal.one_time_investment || 0);
  if (setupAmount > 0) {
    transactions.push({
      kind: "income",
      description: `Setup / Investimento Único - ${proposal.title}`,
      amount: setupAmount,
      due_date: proposal.first_due_date ?? ymd(new Date()),
      status: "pending",
      kind: "income",
      type: "income",
      account_id: proposal.account_id ?? null,
      category_id: proposal.category_id ?? null,
      client_id: clientId,
      project_id: projectId,
      proposal_id: proposal.id,
      contract_id: contractId,
      owner_id: proposal.owner_id ?? null,
    });
  }

  if (transactions.length) {
    const { error: txErr } = await sb.from("transactions").insert(transactions);
    if (txErr) throw txErr;
    txCreated = transactions.length;
  }

  // Final Proposal Update
  const { error: upErr } = await sb.from("proposals").update(proposalUpdate).eq("id", proposalId);
  if (upErr) throw upErr;

  // 6. Record events and timeline
  await recordProposalEventAdmin(sb, proposalId, ctx.internalApproval ? "internal_approval" : "approved", {
    jobs_created: 1, // The project itself is the main "job" container
    transactions_created: txCreated,
    accepted_name: ctx.acceptedName ?? null,
    internal_approval: ctx.internalApproval ?? false,
  }, { name: ctx.acceptedName ?? null });

  await recordTimelineEvent({
    client_id: clientId,
    type: 'proposal_approved',
    title: 'Proposta convertida',
    description: `A proposta "${proposal.title}" foi convertida em contrato, projeto e lançamentos financeiros.`,
    metadata: { proposal_id: proposalId }
  });

  return {
    client_id: clientId!,
    project_id: projectId!,
    contract_id: contractId,
    jobs_created: 1,
    transactions_created: txCreated,
    created_at: new Date().toISOString(),
  };
}

export async function revertProposalApproval(
  sb: SB,
  proposalId: string,
  opts: { reopen?: boolean } = {},
): Promise<void> {
  // cancel pending transactions tied to this proposal
  await sb
    .from("transactions")
    .update({ status: "cancelled" })
    .eq("proposal_id", proposalId)
    .eq("status", "pending");

  const { data: proposal } = await sb
    .from("proposals")
    .select("generated_project_id, generated_contract_id")
    .eq("id", proposalId)
    .maybeSingle();

  if (proposal?.generated_contract_id) {
    await sb.from("contracts").update({ status: "cancelled" }).eq("id", proposal.generated_contract_id);
  }
  if (proposal?.generated_project_id) {
    await sb.from("projects").update({ status: "archived" }).eq("id", proposal.generated_project_id);
  }

  await sb
    .from("proposals")
    .update({ status: opts.reopen ? "draft" : "cancelled" })
    .eq("id", proposalId);

  await recordProposalEventAdmin(sb, proposalId, opts.reopen ? "reopened" : "cancelled");
}
