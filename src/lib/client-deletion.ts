import { supabase } from "@/integrations/supabase/client";

export type ClientImpact = {
  client_name: string;
  projects: number;
  jobs: number;
  files: number;
  calendar_events: number;
  portal_active: boolean;
  future_installments: number;
  proposals_draft: number;
  proposals_approved: number;
  services: number;
};

export async function analyzeClientImpact(clientId: string): Promise<ClientImpact> {
  const today = new Date().toISOString().slice(0, 10);

  const [client, projects, jobs, portal, transactions, proposals, services] =
    await Promise.all([
      supabase.from("clients").select("name, company, portal_enabled").eq("id", clientId).single(),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("client_id", clientId),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("client_id", clientId),
      supabase
        .from("client_portal_users")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "active"),
      supabase
        .from("transactions")
        .select("id,status,due_date", { count: "exact" })
        .eq("client_id", clientId),
      supabase.from("proposals").select("id,status").eq("client_id", clientId),
      supabase.from("client_services").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    ]);

  // Optional tables (may not exist in this project)
  let calendarCount = 0;
  try {
    const r = await supabase
      .from("calendar_events" as never)
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);
    calendarCount = (r as { count: number | null }).count ?? 0;
  } catch {
    /* table absent */
  }

  const futureInstallments =
    (transactions.data ?? []).filter(
      (t: { status: string; due_date: string | null }) =>
        t.status === "pending" && (t.due_date ?? "") >= today,
    ).length;

  const proposalsDraft = (proposals.data ?? []).filter(
    (p: { status: string }) => p.status === "draft" || p.status === "cancelled" || p.status === "lost",
  ).length;
  const proposalsApproved = (proposals.data ?? []).filter(
    (p: { status: string }) => p.status === "accepted" || p.status === "approved" || p.status === "won",
  ).length;

  const name = (client.data as { name?: string; company?: string } | null);
  return {
    client_name: name?.company || name?.name || "Cliente",
    projects: projects.count ?? 0,
    jobs: jobs.count ?? 0,
    files: 0,
    calendar_events: calendarCount,
    portal_active: !!(name as unknown as { portal_enabled?: boolean })?.portal_enabled || (portal.count ?? 0) > 0,
    future_installments: futureInstallments,
    proposals_draft: proposalsDraft,
    proposals_approved: proposalsApproved,
    services: services.count ?? 0,
  };
}

async function safeDelete(table: string, filter: { column: string; value: string }) {
  try {
    await supabase.from(table as never).delete().eq(filter.column, filter.value);
  } catch {
    /* ignore missing tables */
  }
}

export async function deleteClientCascade(clientId: string): Promise<{
  projects_removed: number;
  jobs_removed: number;
  transactions_cancelled: number;
  transactions_kept: number;
  proposals_removed: number;
  proposals_kept: number;
  portal_users_removed: number;
  services_removed: number;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const impact = await analyzeClientImpact(clientId);

  // 1) Future/pending transactions → delete. Paid → keep but unlink.
  const { data: txAll } = await supabase
    .from("transactions")
    .select("id,status,due_date,paid_at")
    .eq("client_id", clientId);

  const futureIds = (txAll ?? [])
    .filter((t) => t.status === "pending" && (t.due_date ?? "") >= today)
    .map((t) => t.id);
  let transactions_cancelled = 0;
  if (futureIds.length) {
    const { error } = await supabase.from("transactions").delete().in("id", futureIds);
    if (!error) transactions_cancelled = futureIds.length;
  }
  const keepIds = (txAll ?? []).filter((t) => !futureIds.includes(t.id)).map((t) => t.id);
  let transactions_kept = 0;
  if (keepIds.length) {
    await supabase.from("transactions").update({ client_id: null }).in("id", keepIds);
    transactions_kept = keepIds.length;
  }

  // 2) Proposals: drafts/cancelled → delete; approved → keep (unlink client)
  const { data: propAll } = await supabase
    .from("proposals")
    .select("id,status")
    .eq("client_id", clientId);
  const removeProposalIds = (propAll ?? [])
    .filter((p) => p.status === "draft" || p.status === "cancelled" || p.status === "lost")
    .map((p) => p.id);
  const keepProposalIds = (propAll ?? []).filter((p) => !removeProposalIds.includes(p.id)).map((p) => p.id);

  let proposals_removed = 0;
  if (removeProposalIds.length) {
    await supabase.from("proposal_items").delete().in("proposal_id", removeProposalIds);
    await supabase.from("proposal_events").delete().in("proposal_id", removeProposalIds);
    const { error } = await supabase.from("proposals").delete().in("id", removeProposalIds);
    if (!error) proposals_removed = removeProposalIds.length;
  }
  if (keepProposalIds.length) {
    await supabase.from("proposals").update({ client_id: null }).in("id", keepProposalIds);
  }

  // 3) Jobs: delete checklist + comments + jobs (by client_id and by project_id)
  const { data: projectsRows } = await supabase
    .from("projects")
    .select("id")
    .eq("client_id", clientId);
  const projectIds = (projectsRows ?? []).map((p) => p.id);

  const { data: jobsRows } = await supabase
    .from("jobs")
    .select("id")
    .or(
      projectIds.length
        ? `client_id.eq.${clientId},project_id.in.(${projectIds.join(",")})`
        : `client_id.eq.${clientId}`,
    );
  const jobIds = (jobsRows ?? []).map((j) => j.id);
  if (jobIds.length) {
    await supabase.from("job_checklist").delete().in("job_id", jobIds);
    await supabase.from("job_comentarios").delete().in("job_id", jobIds);
    await supabase.from("jobs").delete().in("id", jobIds);
  }

  // 4) Projects: members, then projects
  let projects_removed = 0;
  if (projectIds.length) {
    await supabase.from("project_members").delete().in("project_id", projectIds);
    const { error } = await supabase.from("projects").delete().in("id", projectIds);
    if (!error) projects_removed = projectIds.length;
  }

  // 5) Approvals + calendar events (optional)
  await safeDelete("approvals", { column: "client_id", value: clientId });
  await safeDelete("calendar_events", { column: "client_id", value: clientId });

  // 6) Portal users
  const { data: portalRows } = await supabase
    .from("client_portal_users")
    .select("id")
    .eq("client_id", clientId);
  const portal_users_removed = portalRows?.length ?? 0;
  if (portal_users_removed) {
    await supabase.from("client_portal_users").delete().eq("client_id", clientId);
  }

  // 7) Client services
  const { data: svcRows } = await supabase
    .from("client_services")
    .select("id")
    .eq("client_id", clientId);
  const services_removed = svcRows?.length ?? 0;
  if (services_removed) {
    await supabase.from("client_services").delete().eq("client_id", clientId);
  }

  // 8) Contracts linked to the client
  await supabase.from("contracts").delete().eq("client_id", clientId);

  // 9) Finally the client
  const { error: cliErr } = await supabase.from("clients").delete().eq("id", clientId);
  if (cliErr) throw cliErr;

  // 10) Audit log
  const { data: u } = await supabase.auth.getUser();
  const actorId = u.user?.id ?? null;
  let actorName: string | null = null;
  if (actorId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", actorId)
      .maybeSingle();
    actorName = prof?.display_name ?? prof?.full_name ?? u.user?.email ?? null;
  }

  await supabase.from("client_deletion_audit" as never).insert({
    client_id: clientId,
    client_name: impact.client_name,
    deleted_by: actorId,
    deleted_by_name: actorName,
    projects_removed,
    jobs_removed: jobIds.length,
    transactions_cancelled,
    transactions_kept,
    proposals_removed,
    proposals_kept: keepProposalIds.length,
    portal_users_removed,
    services_removed,
  } as never);

  return {
    projects_removed,
    jobs_removed: jobIds.length,
    transactions_cancelled,
    transactions_kept,
    proposals_removed,
    proposals_kept: keepProposalIds.length,
    portal_users_removed,
    services_removed,
  };
}
