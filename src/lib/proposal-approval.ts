import type { SupabaseClient } from "@supabase/supabase-js";
import { JOB_TEMPLATES } from "./job-templates";
import { recordProposalEventAdmin } from "./proposal-events";
import { recordTimelineEvent } from "./client-timeline";

import { fetchJobStages } from "./ops-api";

type SB = SupabaseClient;

function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setMonth(r.getMonth() + n);
  return r;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function safeBillingDay(year: number, month0: number, day: number): Date {
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

  // 2. Ensure client
  let clientId: string | null = proposal.client_id ?? null;
  if (!clientId) {
    const name = proposal.client_name?.trim() || "Cliente";
    // try to match by name
    const { data: existing } = await sb
      .from("clients")
      .select("id")
      .or(`company.ilike.${name},name.ilike.${name}`)
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      clientId = existing.id;
    } else {
      const { data: created, error: cErr } = await sb
        .from("clients")
        .insert({
          name,
          company: name,
          email: proposal.client_email ?? null,
          owner_id: proposal.owner_id ?? null,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      clientId = created.id;
    }
  }

  // 3. Project - One project per contract
  let projectId: string | null = proposal.generated_project_id ?? null;
  
  // 4. Contract (Mandatory in new architecture)
  let contractId: string | null = proposal.generated_contract_id ?? null;
  const monthly = Number(proposal.monthly_investment ?? 0);
  const totalValue = Number(proposal.total ?? proposal.one_time_investment ?? 0);
  
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
    partner_id: (proposal as any).commercial_id || null, // Link to representative
    type: proposal.contract_type || (monthly > 0 ? "recurring" : "one_time"),
    service_ids: proposal.service_ids ?? [],
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

  // Now handle project creation/linkage
  const isRecurring = proposal.contract_type === "recurring" || (monthly > 0 && !proposal.contract_type);
  
  if (projectId) {
    // reactivate if archived and ensure linkage
    await sb.from("projects").update({ 
      status: "active", 
      contract_id: contractId,
      client_id: clientId,
      type: "automatic"
    }).eq("id", projectId);
  } else {
    // For recurring contracts, check if a main project already exists for this client/contract
    let existingPrjId = null;
    
    if (isRecurring) {
      const { data: existingPrj } = await sb.from("projects")
        .select("id")
        .eq("client_id", clientId)
        .eq("type", "automatic")
        .ilike("name", "Operação Mensal %")
        .limit(1)
        .maybeSingle();
      existingPrjId = existingPrj?.id;
    }

    if (existingPrjId) {
      projectId = existingPrjId;
      await sb.from("projects").update({ 
        status: "active",
        contract_id: contractId 
      }).eq("id", projectId);
    } else {
      const projectName = isRecurring 
        ? `Operação Mensal ${proposal.client_name || "Cliente"}`
        : proposal.title;

      const { data: createdProject, error: prjErr } = await sb
        .from("projects")
        .insert({
          name: projectName,
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
  }

  // Update proposal with the generated IDs if they changed
  await sb.from("proposals").update({
    generated_project_id: projectId,
    generated_contract_id: contractId
  }).eq("id", proposalId);


  // 4b. Sync Client Services (for tracking what's active for this client)
  if (proposal.service_ids?.length) {
    const servicesToInsert = proposal.service_ids.map((sid: string) => ({
      client_id: clientId,
      service_id: sid,
      contract_type: proposal.contract_type === "recurring" ? "recurring" : "one_time",
      monthly_value: proposal.contract_type === "recurring" ? monthly : 0,
      one_time_value: proposal.contract_type === "one_time" ? totalValue : 0,
      status: "active",
      start_date: proposal.first_due_date || ymd(new Date()),
    }));

    // Upsert client services (simplified: delete existing for these specific services and re-insert or just insert if not exists)
    // For now, let's just insert them if they don't exist
    for (const s of servicesToInsert) {
      const { data: existing } = await sb.from("client_services")
        .select("id")
        .eq("client_id", clientId)
        .eq("service_id", s.service_id)
        .maybeSingle();
      if (!existing) {
        await sb.from("client_services").insert(s);
      } else {
        await sb.from("client_services").update(s).eq("id", existing.id);
      }
    }
  }

  // 5. Jobs from Templates
  let jobsCreated = 0;
  if (proposal.auto_create_jobs !== false) {
    const { data: jobTemplates, error: tplErr } = await sb
      .from("service_job_templates")
      .select(`
        *,
        checklists:service_job_checklist(*),
        op_template:operational_templates(id, default_steps)
      `)
      .in("service_id", proposal.service_ids ?? [])
      .order("order_index");
    
    if (tplErr) console.error("Error fetching templates", tplErr);

    const stagesList = await fetchJobStages();
    const firstStageId = stagesList[0]?.id ?? null;

    if (jobTemplates && jobTemplates.length > 0) {
      for (const tpl of jobTemplates) {
        const jobDueDate = tpl.default_duration_days 
          ? new Date(Date.now() + tpl.default_duration_days * 86400000).toISOString().slice(0, 10)
          : null;

        const { data: job, error: jobErr } = await sb
          .from("jobs")
          .insert({
            project_id: projectId,
            client_id: clientId,
            title: tpl.name,
            stage_id: tpl.initial_stage_id || firstStageId,
            status: 'not_started',
            order_index: tpl.order_index,
            due_date: jobDueDate,
            main_responsible_id: tpl.default_assignee_id || proposal.responsible_id || null,
            labels: ["operational_template"],
            
            custom_fields_schema: (tpl as any).custom_fields_schema || null,
          })
          .select()
          .single();

        if (!jobErr && job) {
          jobsCreated++;
          if ((tpl as any).checklists?.length) {
            await sb.from("job_checklist").insert(
              (tpl as any).checklists.map((c: any) => ({
                job_id: job.id,
                content: c.content,
                order_index: c.order_index
              }))
            );
          }
        }
      }
    }

    // Fallback if no flow jobs were created
    if (jobsCreated === 0) {
      // existing job titles to avoid dupes
      const { data: existingJobs } = await sb
        .from("jobs")
        .select("title")
        .eq("project_id", projectId);
      const existingTitles = new Set((existingJobs ?? []).map((j: { title: string }) => j.title));

      const rows: Array<Record<string, unknown>> = [];
      let order = 0;
      for (const item of proposal.scope ?? []) {
        const title = String(item);
        if (existingTitles.has(title)) continue;
        rows.push({
          title,
          description: null,
          project_id: projectId,
          client_id: clientId,
          stage_id: firstStageId,
          assignee_id: proposal.responsible_id ?? null,
          order_index: order++,
          priority: "normal",
          labels: ["proposal_scope"],
        });
      }
      if (rows.length) {
        const { error: jErr } = await sb.from("jobs").insert(rows);
        if (jErr) throw jErr;
        jobsCreated = rows.length;
      }
    }
  }

  // 6. Transactions
  let txCreated = 0;

  // 6a. Recurring (monthly contract)
  if (monthly > 0 && contractId) {
    const months = Math.max(1, Number(proposal.recurring_months ?? 12));
    const billingDay = Number(proposal.billing_day ?? 5);
    const start = proposal.first_due_date
      ? new Date(proposal.first_due_date)
      : safeBillingDay(new Date().getFullYear(), new Date().getMonth(), billingDay);


    // existing months for this contract to avoid dupes
    const { data: existingTx } = await sb
      .from("transactions")
      .select("due_date")
      .eq("contract_id", contractId);
    const existingMonths = new Set(
      (existingTx ?? []).map((t: { due_date: string }) => t.due_date.slice(0, 7)),
    );

    const rows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < months; i++) {
      const due = safeBillingDay(start.getFullYear(), start.getMonth() + i, billingDay);
      const key = ymd(due).slice(0, 7);
      if (existingMonths.has(key)) continue;
      rows.push({
        kind: "income",
        description: `${proposal.title} — Mensalidade ${i + 1}/${months}`,
        amount: monthly,
        due_date: ymd(due),
        status: "pending",
        is_recurring: true,

        account_id: proposal.account_id ?? null,
        category_id: proposal.category_id ?? null,
        client_id: clientId,
        project_id: projectId,
        proposal_id: proposal.id,
        contract_id: contractId,
        owner_id: proposal.owner_id ?? null,


      });
    }
    if (rows.length) {
      const { error: txErr } = await sb.from("transactions").insert(rows);
      if (txErr) throw txErr;
      txCreated += rows.length;
    }
  }


  // 6b. One-time (installments)
  const oneTime = Number(proposal.one_time_investment ?? 0);
  const wantsOneTime =
    oneTime > 0 && (proposal.payment_kind === "one_time" || proposal.payment_kind === "mixed" || isRecurring);
  if (wantsOneTime) {
    // skip if already created (idempotent)
    const { count } = await sb
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", proposal.id)
      .is("contract_id", null);
    if (!count) {
      const installments = Math.max(1, Number(proposal.installments ?? 1));
      const amount = Math.round((oneTime / installments) * 100) / 100;
      const base = proposal.first_due_date
        ? new Date(proposal.first_due_date)
        : new Date();


      const rows = Array.from({ length: installments }).map((_, i) => ({
        kind: "income",
        description: `${proposal.title} — Parcela ${i + 1}/${installments}`,
        amount,
        due_date: ymd(addMonths(base, i)),
        status: "pending",
        is_recurring: installments > 1,
        installment_number: i + 1,
        installment_total: installments,
        account_id: proposal.account_id ?? null,
        category_id: proposal.category_id ?? null,
        client_id: clientId,
        project_id: projectId,
        proposal_id: proposal.id,
        contract_id: contractId,
        owner_id: proposal.owner_id ?? null,


      }));
      const { error: txErr } = await sb.from("transactions").insert(rows);
      if (txErr) throw txErr;
      txCreated += rows.length;
    }

  }

  // 7. Update proposal status + linkage
  const patch: Record<string, unknown> = {
    status: "converted",
    accepted_at: new Date().toISOString(),
    converted_at: new Date().toISOString(),
    client_id: clientId,
    generated_project_id: projectId,
    generated_contract_id: contractId,
  };
  if (ctx.acceptedName) patch.accepted_name = ctx.acceptedName;
  if (ctx.acceptedIp) patch.accepted_ip = ctx.acceptedIp;
  if (ctx.internalApproval) {
    patch.internal_approval = true;
    patch.internal_approval_by = ctx.internalApprovalBy;
    patch.internal_approval_at = new Date().toISOString();
  }
  const { error: upErr } = await sb.from("proposals").update(patch).eq("id", proposalId);
  if (upErr) throw upErr;

  await recordProposalEventAdmin(sb, proposalId, ctx.internalApproval ? "internal_approval" : "approved", {
    jobs_created: jobsCreated,
    transactions_created: txCreated,
    accepted_name: ctx.acceptedName ?? null,
    internal_approval: ctx.internalApproval ?? false,
  }, { name: ctx.acceptedName ?? null });

  // Record timeline event
  const isAddendum = (proposal.version || 1) > 1;
  await recordTimelineEvent({
    client_id: clientId,
    type: isAddendum ? 'addendum' : 'proposal_approved',
    title: isAddendum ? `Aditivo contratual aprovado (V${proposal.version})` : 'Proposta aprovada',
    description: isAddendum 
      ? `Atualização de escopo e entregas para o contrato ativo.`
      : `Proposta convertida em contrato e projeto iniciados.`,
    metadata: { proposal_id: proposalId, version: proposal.version, is_addendum: isAddendum }
  });

  if (!isAddendum) {
    await recordTimelineEvent({
      client_id: clientId,
      type: 'contract_generated',
      title: 'Contrato gerado e ativo',
      metadata: { contract_id: contractId }
    });
    await recordTimelineEvent({
      client_id: clientId,
      type: 'project_created',
      title: 'Projeto operacional criado',
      metadata: { project_id: projectId }
    });
  }

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
