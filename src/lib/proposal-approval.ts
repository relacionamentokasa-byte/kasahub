import type { SupabaseClient } from "@supabase/supabase-js";
// import { JOB_TEMPLATES } from "./job-templates"; // removed
import { recordProposalEventAdmin } from "./proposal-events";
import { recordTimelineEvent } from "./client-timeline";



type SB = SupabaseClient;

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setMonth(r.getMonth() + n);
  return r;
}

export function ymd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  // TRAVA: nenhuma aprovação (nem interna) pode ocorrer sem a assinatura digital do cliente
  const hasClientSignature =
    (proposal.signature_client && String(proposal.signature_client).trim().length > 0) ||
    ((proposal as any).client_signature_data && String((proposal as any).client_signature_data).trim().length > 0);
  if (!hasClientSignature) {
    throw new Error("Esta proposta não pode ser aprovada sem a assinatura digital do cliente. Envie o link público para o cliente assinar.");
  }

  const { data: items, error: iErr } = await sb
    .from("proposal_items")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("order_index", { ascending: true });
  if (iErr) throw iErr;

  // 2. Step 1: Upsert de Cliente (Verificar/Criar de forma segura)
  let clientId: string | null = proposal.client_id ?? null;
  if (!clientId) {
    const clientName = proposal.client_name?.trim() || "Cliente";
    const clientEmail = proposal.client_email?.trim()?.toLowerCase();

    // 1. Busca prioritária por e-mail se presente
    let existing: { id: string } | null = null;
    if (clientEmail) {
      const { data: byEmail } = await sb
        .from("clients")
        .select("id")
        .eq("email", clientEmail)
        .limit(1)
        .maybeSingle();
      if (byEmail?.id) existing = byEmail;
    }

    // 2. Fallback: busca por nome/empresa sem risco de syntax error com caracteres especiais
    if (!existing && clientName) {
      const { data: byCompany } = await sb
        .from("clients")
        .select("id")
        .ilike("company", clientName)
        .limit(1)
        .maybeSingle();
      if (byCompany?.id) {
        existing = byCompany;
      } else {
        const { data: byName } = await sb
          .from("clients")
          .select("id")
          .ilike("name", clientName)
          .limit(1)
          .maybeSingle();
        if (byName?.id) existing = byName;
      }
    }

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

  const contractData: Record<string, any> = {
    title: proposal.title,
    client_id: clientId,
    proposal_id: proposal.id,
    monthly_value: monthly,
    total_value: totalValue,
    billing_day: (proposal as any).billing_day ?? 5,
    start_date: proposal.first_due_date ?? ymd(new Date()),
    status: "active",
    owner_id: proposal.owner_id ?? null,
    partner_id: (proposal as any).commercial_id || null, 
    type: proposal.contract_type || (monthly > 0 ? "recurring" : "one_time"),
    service_ids: (proposal as any).service_ids ?? [],
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

  // Create Project (vinculado ao cliente, proposta e contrato)
  let projectId: string | null = proposal.generated_project_id ?? null;

  // Se a proposta aponta para um projeto que foi excluído, recria.
  if (projectId) {
    const { data: existingProject } = await sb
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (!existingProject) projectId = null;
  }

  if (!projectId) {
    if (!clientId) {
      throw new Error("Não foi possível criar o projeto: cliente não identificado.");
    }
    const projectPayload = {
      name: proposal.title || "Projeto sem título",
      client_id: clientId,
      proposal_id: proposal.id,
      contract_id: contractId,
      briefing: proposal.briefing ?? proposal.intro ?? null,
      owner_id: proposal.responsible_id ?? proposal.owner_id ?? null,
      responsible_id: proposal.responsible_id ?? proposal.owner_id ?? null,
      status: "active",
      type: "automatic",
    };
    console.log("Payload do Projeto:", projectPayload);
    try {
      const { data: createdProject, error: prjErr } = await sb
        .from("projects")
        .insert(projectPayload)
        .select("id")
        .single();
      if (prjErr) {
        console.error("[approveProposal] Falha ao criar projeto:", prjErr, "payload:", projectPayload);
        throw new Error(`Não foi possível criar o projeto: ${prjErr.message}`);
      }
      projectId = createdProject.id;
    } catch (e) {
      console.error("[approveProposal] Exceção ao criar projeto:", e, "payload:", projectPayload);
      throw e;
    }
  }

  proposalUpdate.generated_project_id = projectId;
  proposalUpdate.generated_contract_id = contractId;

  // 5. Step 4: Jobs NÃO são criados automaticamente.
  // O projeto é criado vazio e o usuário cria os jobs manualmente depois.
  const jobsCreated = 0;


  // 6. Step 5: Geração Automática do Financeiro (Receita Prevista)
  let txCreated = 0;
  const transactions: any[] = [];

  // Injeção automática de categoria financeira com busca resiliente
  const { data: allCats } = await sb
    .from("categorias_financeiras")
    .select("id, nome");

  const normalizeStr = (s?: string) => s?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") || "";

  const feeMensalId = allCats?.find((c: any) => {
    const n = normalizeStr(c.nome);
    return n.includes("fee") || n.includes("mensal") || n.includes("recorrente");
  })?.id ?? null;

  const jobAvulsoId = allCats?.find((c: any) => {
    const n = normalizeStr(c.nome);
    return n.includes("avulso") || n.includes("setup") || n.includes("servico") || n.includes("projeto");
  })?.id ?? feeMensalId ?? allCats?.[0]?.id ?? null;

  // A. Geração das parcelas mensais (Fee)
  const monthlyAmount = Number(proposal.monthly_investment || 0);
  if (monthlyAmount > 0 && installmentsCount > 0) {
    const firstDueRaw = proposal.first_due_date ?? ymd(new Date());
    const [fy, fm, fd] = firstDueRaw.split("-").map(Number);
    const dayOfMonth = (proposal as any).billing_day ?? fd ?? 5;
    const baseYear = fy;
    const baseMonth0 = fm - 1;

    for (let i = 0; i < installmentsCount; i++) {
      const due = safeBillingDay(baseYear, baseMonth0 + i, dayOfMonth);
      transactions.push({
        client_id: clientId,
        proposal_id: proposal.id,
        contract_id: contractId,
        category_id: feeMensalId,
        amount: monthlyAmount,
        valor_previsto: monthlyAmount,
        due_date: ymd(due),
        description: `Mensalidade ${proposal.title} (${i + 1}/${installmentsCount})`,
        status: "pending",
        type: "income",
        kind: "income",
        is_recurring: true,
      });
    }
  }

  // B. Geração do Setup / Investimento (Único ou Especial)
  const setupAmount = Number(proposal.one_time_investment || 0);
  if (setupAmount > 0) {
    const isSpecial = !!proposal.is_special_negotiation;
    const instCount = Number(proposal.installments || 1);
    const firstDueRaw = proposal.first_due_date ?? ymd(new Date());
    const [baseY, baseM, baseD] = firstDueRaw.split("-").map(Number);
    const baseDate = new Date(baseY, baseM - 1, baseD, 12, 0, 0);

    let installments: any[] = [];

    if (isSpecial && Array.isArray((proposal as any).payment_installments_config) && (proposal as any).payment_installments_config.length > 0) {
      installments = (proposal as any).payment_installments_config.slice(0, instCount);
    } else {
      // Comportamento Padrão: Divisão igualitária
      const { distributeEqually } = await import("./proposal-negotiation");
      installments = distributeEqually(100, instCount);
    }

    const { calculateInstallmentValues } = await import("./proposal-negotiation");
    const values = calculateInstallmentValues(setupAmount, installments);

    values.forEach((inst, i) => {
      let dueDateStr: string;

      if (inst.due_kind === "custom" && inst.due_date) {
        dueDateStr = inst.due_date;
      } else if (inst.due_kind === "entrada") {
        dueDateStr = ymd(baseDate);
      } else if (inst.due_kind?.endsWith("_dias")) {
        const days = parseInt(inst.due_kind.replace("_dias", ""), 10) || (i * 30);
        const d = new Date(baseDate.getTime());
        d.setDate(d.getDate() + days);
        dueDateStr = ymd(d);
      } else {
        const d = new Date(baseDate.getTime());
        d.setDate(d.getDate() + (i * 30));
        dueDateStr = ymd(d);
      }

      transactions.push({
        client_id: clientId,
        proposal_id: proposal.id,
        contract_id: contractId,
        category_id: jobAvulsoId,
        amount: inst.value,
        valor_previsto: inst.value,
        due_date: dueDateStr,
        description: instCount === 1
          ? `Setup (À vista) - ${proposal.title}`
          : `Setup (Parcela ${i + 1}/${instCount}${isSpecial ? ' - Negociação Especial' : ''}) - ${proposal.title}`,
        status: "pending",
        type: "income",
        kind: "income",
        is_recurring: false,
      });
    });
  }

  // Limpeza idempotente de transações pendentes anteriores desta proposta antes de reinserir
  if (transactions.length) {
    const { error: delTxErr } = await sb
      .from("transactions")
      .delete()
      .eq("proposal_id", proposal.id)
      .eq("status", "pending");
    if (delTxErr) {
      console.warn("[approveProposal] Aviso ao limpar transações anteriores:", delTxErr);
    }

    const { error: txErr } = await sb.from("transactions").insert(transactions);
    if (txErr) throw txErr;
    txCreated = transactions.length;
  }


  // Final Proposal Update
  const { error: upErr } = await sb.from("proposals").update(proposalUpdate).eq("id", proposalId);
  if (upErr) throw upErr;

  // 7. Record events and timeline
  await recordProposalEventAdmin(sb, proposalId, ctx.internalApproval ? "internal_approval" : "approved", {
    jobs_created: jobsCreated || 1,
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
    jobs_created: jobsCreated,
    transactions_created: txCreated,
    created_at: new Date().toISOString(),
  };
}

export async function revertProposalApproval(
  sb: SB,
  proposalId: string,
  opts: { reopen?: boolean } = {},
): Promise<void> {
  // 1. Delete transactions (financeiro)
  const { error: txErr } = await sb
    .from("transactions")
    .delete()
    .eq("proposal_id", proposalId);
  if (txErr) console.warn("Erro ao deletar transações na reversão:", txErr);

  // 2. Load IDs to delete related data
  const { data: proposal } = await sb
    .from("proposals")
    .select("generated_project_id, generated_contract_id")
    .eq("id", proposalId)
    .maybeSingle();

  // 3. Delete Calendar Events linked to the project
  if (proposal?.generated_project_id) {
    const { error: evErr } = await sb
      .from("calendar_events")
      .delete()
      .eq("project_id", proposal.generated_project_id);
    if (evErr) console.warn("Erro ao deletar eventos do calendário:", evErr);
  }

  // 4. Delete Project
  if (proposal?.generated_project_id) {
    const { error: prjErr } = await sb
      .from("projects")
      .delete()
      .eq("id", proposal.generated_project_id);
    if (prjErr) console.warn("Erro ao deletar projeto:", prjErr);
  }

  // 5. Delete Contract
  if (proposal?.generated_contract_id) {
    const { error: ctErr } = await sb
      .from("contracts")
      .delete()
      .eq("id", proposal.generated_contract_id);
    if (ctErr) console.warn("Erro ao deletar contrato:", ctErr);
  }

  // 6. Update Proposal Status and clear generated IDs
  // Status válidos no banco: Rascunho | Enviada | Aprovada | Recusada | Encerrada.
  // "Cancelada" NÃO é aceito pelo check constraint → usamos "Encerrada" como fallback.
  const targetStatus = opts.reopen ? "Rascunho" : "Encerrada";

  const { error: upErr } = await sb
    .from("proposals")
    .update({
      status: targetStatus,
      generated_project_id: null,
      generated_contract_id: null,
      accepted_at: null,
      converted_at: null
    })
    .eq("id", proposalId);
  if (upErr) {
    console.error(`[CRITICAL] Falha ao atualizar status da proposta. Tentou enviar status="${targetStatus}". Erro:`, upErr);
    throw new Error(`Não foi possível atualizar o status para "${targetStatus}": ${upErr.message}`);
  }

  await recordProposalEventAdmin(sb, proposalId, opts.reopen ? "reopened" : "cancelled");
}
